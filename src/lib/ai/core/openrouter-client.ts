import "server-only";

import * as z from "zod";

import { aiConfig } from "@/config/ai";
import { siteConfig } from "@/config/site";

import { AiError } from "./errors";

export type ChatMessage = { role: "system" | "user"; content: string };

/** OpenRouter's response_format (API reference: parameters, structured outputs). */
export type ResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: Record<string, unknown> };
    };

export type ChatCompletionRequest = {
  apiKey: string;
  model: string;
  messages: readonly ChatMessage[];
  temperature: number;
  maxTokens: number;
  responseFormat?: ResponseFormat;
  disableReasoning?: boolean;
  timeoutMs: number;
  /** Optional app attribution (HTTP-Referer); no header when absent. */
  siteUrl?: string;
};

export type ChatUsage = { promptTokens: number | null; completionTokens: number | null };

export type ChatCompletionResult = {
  /** The assistant message text; "" when the model sent none (e.g. finish_reason "length"). */
  content: string;
  /** The model that answered, as OpenRouter reports it (falls back to the requested id). */
  model: string;
  usage: ChatUsage;
  latencyMs: number;
};

export type OpenRouterClientOptions = {
  fetchImpl?: typeof fetch;
  /** Monotonic milliseconds, for latency. */
  clock?: () => number;
};

// Only the fields we read; everything else in the body is ignored.
const EmbeddedErrorSchema = z.object({ code: z.union([z.number(), z.string()]).optional() });

const CompletionSchema = z.object({
  model: z.string().optional(),
  error: EmbeddedErrorSchema.optional(),
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable().optional() }).optional(),
        finish_reason: z.string().nullable().optional(),
        error: EmbeddedErrorSchema.optional(),
      }),
    )
    .optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .optional(),
});

/** Maps an HTTP error status (OpenRouter "Errors and debugging") to a code. */
export function aiErrorFromStatus(status: number): AiError {
  if (status === 429) return new AiError("RATE_LIMITED", "OpenRouter rate limit (429)", status);
  if (status === 402) return new AiError("PAYMENT_REQUIRED", "OpenRouter credits (402)", status);
  if (status === 401 || status === 403) {
    return new AiError("AUTH", `OpenRouter refused the request (${status})`, status);
  }
  if (status === 408) return new AiError("TIMEOUT", "OpenRouter timed out (408)", status);
  if (status >= 500) return new AiError("UPSTREAM", `OpenRouter error (${status})`, status);
  return new AiError("BAD_REQUEST", `OpenRouter rejected the request (${status})`, status);
}

function embeddedError(code: number | string | undefined): AiError {
  const status = typeof code === "number" ? code : Number(code);
  return Number.isInteger(status) && status >= 400
    ? aiErrorFromStatus(status)
    : new AiError("UPSTREAM", "OpenRouter reported an error in the response");
}

function isAbortLike(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function buildBody(request: ChatCompletionRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    stream: false,
  };
  if (request.responseFormat) body.response_format = request.responseFormat;
  // Reasoning tokens count against max_tokens (OpenRouter reasoning-tokens guide).
  if (request.disableReasoning) body.reasoning = { enabled: false };
  return body;
}

/**
 * One non-streaming chat completion (POST /api/v1/chat/completions). The key travels only in the
 * Authorization header. No retries: the caller moves on to the next model instead. Throws AiError
 * for every failure; its message never contains the URL, key, prompt or response body.
 */
export async function createChatCompletion(
  request: ChatCompletionRequest,
  { fetchImpl = fetch, clock = () => performance.now() }: OpenRouterClientOptions = {},
): Promise<ChatCompletionResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${request.apiKey}`,
    "Content-Type": "application/json",
    // Optional app attribution (OpenRouter API reference: headers). X-Title is also accepted.
    "X-OpenRouter-Title": siteConfig.name,
  };
  if (request.siteUrl) headers["HTTP-Referer"] = request.siteUrl;

  const started = clock();
  let json: unknown;
  try {
    const response = await fetchImpl(aiConfig.openRouter.chatCompletionsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(buildBody(request)),
      signal: AbortSignal.timeout(request.timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) {
      // Drop the body unread: it may echo the request.
      await response.body?.cancel().catch(() => {});
      throw aiErrorFromStatus(response.status);
    }
    json = await response.json().catch((error: unknown) => {
      // The timeout also covers reading the body.
      if (isAbortLike(error)) throw error;
      throw new AiError("INVALID_RESPONSE", "OpenRouter response is not JSON");
    });
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (isAbortLike(error)) throw new AiError("TIMEOUT", "OpenRouter request timed out");
    throw new AiError("NETWORK", "OpenRouter request failed");
  }
  const latencyMs = Math.round(clock() - started);

  const parsed = CompletionSchema.safeParse(json);
  if (!parsed.success) {
    throw new AiError("INVALID_RESPONSE", "OpenRouter response has an unexpected shape");
  }
  const { error, choices, usage, model } = parsed.data;
  if (error) throw embeddedError(error.code);
  const choice = choices?.[0];
  if (!choice) throw new AiError("INVALID_RESPONSE", "OpenRouter response has no choices");
  // A provider failure after generation started still comes back as HTTP 200.
  if (choice.error || choice.finish_reason === "error") throw embeddedError(choice.error?.code);

  return {
    content: choice.message?.content ?? "",
    model: model ?? request.model,
    usage: {
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
    },
    latencyMs,
  };
}
