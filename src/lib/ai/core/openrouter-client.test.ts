import { describe, expect, it, vi } from "vitest";

import { aiConfig } from "@/config/ai";

import { AiError } from "./errors";
import { createChatCompletion, type ChatCompletionRequest } from "./openrouter-client";

const API_KEY = "sk-or-test-key-never-leaks";

const REQUEST: ChatCompletionRequest = {
  apiKey: API_KEY,
  model: "vendor/model:free",
  messages: [
    { role: "system", content: "system prompt" },
    { role: "user", content: "{}" },
  ],
  temperature: 0.3,
  maxTokens: 900,
  timeoutMs: 1000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function completion(content: string | null, extra: Record<string, unknown> = {}) {
  return {
    id: "gen-1",
    model: "vendor/model:free",
    choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 812, completion_tokens: 231, total_tokens: 1043 },
    ...extra,
  };
}

function run(fetchImpl: typeof fetch, request: Partial<ChatCompletionRequest> = {}) {
  let tick = 0;
  // Each clock read advances 25 ms, so latency is deterministic.
  const clock = () => (tick += 25);
  return createChatCompletion({ ...REQUEST, ...request }, { fetchImpl, clock });
}

async function expectAiError(promise: Promise<unknown>, code: string): Promise<AiError> {
  const error = await promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(AiError);
  const aiError = error as AiError;
  expect(aiError.code).toBe(code);
  expect(aiError.message).not.toContain(API_KEY);
  expect(aiError.message).not.toContain("openrouter.ai");
  return aiError;
}

describe("createChatCompletion", () => {
  it("POSTs the documented body with the key only in the Authorization header", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(completion('{"a":1}')));
    const result = await run(fetchImpl, {
      responseFormat: { type: "json_object" },
      disableReasoning: true,
      siteUrl: "https://example.com",
    });

    expect(result).toEqual({
      content: '{"a":1}',
      model: "vendor/model:free",
      usage: { promptTokens: 812, completionTokens: 231 },
      latencyMs: 25,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(aiConfig.openRouter.chatCompletionsUrl);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers["HTTP-Referer"]).toBe("https://example.com");
    expect(headers["X-OpenRouter-Title"]).toBe("Yanchar Takhlil");
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({
      model: "vendor/model:free",
      messages: REQUEST.messages,
      temperature: 0.3,
      max_tokens: 900,
      stream: false,
      response_format: { type: "json_object" },
      reasoning: { enabled: false },
    });
    expect(String(init?.body)).not.toContain(API_KEY);
  });

  it("omits response_format, reasoning and HTTP-Referer when not asked for", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(completion("x")));
    await run(fetchImpl);
    const init = fetchImpl.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("response_format");
    expect(body).not.toHaveProperty("reasoning");
    expect(init?.headers).not.toHaveProperty("HTTP-Referer");
  });

  it("returns empty content and null usage when the model sent none", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        choices: [{ message: { content: null }, finish_reason: "length" }],
      }),
    );
    const result = await run(fetchImpl);
    expect(result.content).toBe("");
    expect(result.model).toBe("vendor/model:free");
    expect(result.usage).toEqual({ promptTokens: null, completionTokens: null });
  });

  it.each([
    [429, "RATE_LIMITED"],
    [402, "PAYMENT_REQUIRED"],
    [401, "AUTH"],
    [403, "AUTH"],
    [400, "BAD_REQUEST"],
    [408, "TIMEOUT"],
    [500, "UPSTREAM"],
    [502, "UPSTREAM"],
    [503, "UPSTREAM"],
  ])("maps HTTP %i to %s without reading the body", async (status, code) => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { code: status, message: `echo ${API_KEY}` } }, status),
    );
    const error = await expectAiError(run(fetchImpl), code);
    expect(error.status).toBe(status);
  });

  it("maps our own timeout to TIMEOUT", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    await expectAiError(run(fetchImpl), "TIMEOUT");
  });

  it("maps a timeout while reading the body to TIMEOUT", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      const response = jsonResponse({});
      vi.spyOn(response, "json").mockRejectedValue(new DOMException("aborted", "AbortError"));
      return response;
    });
    await expectAiError(run(fetchImpl), "TIMEOUT");
  });

  it("really aborts a hanging request after timeoutMs", async () => {
    const fetchImpl: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    await expectAiError(run(fetchImpl, { timeoutMs: 20 }), "TIMEOUT");
  });

  it("maps a network failure to NETWORK without the cause", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError(`fetch failed for https://openrouter.ai?key=${API_KEY}`);
    });
    const error = await expectAiError(run(fetchImpl), "NETWORK");
    expect(error.cause).toBeUndefined();
  });

  it("maps a non-JSON or malformed 200 to INVALID_RESPONSE", async () => {
    await expectAiError(
      run(async () => new Response("<html>oops</html>", { status: 200 })),
      "INVALID_RESPONSE",
    );
    await expectAiError(
      run(async () => jsonResponse({ choices: [] })),
      "INVALID_RESPONSE",
    );
    await expectAiError(
      run(async () => jsonResponse({ choices: "nope" })),
      "INVALID_RESPONSE",
    );
  });

  it("maps an error inside a 200 response (top level or finish_reason error)", async () => {
    await expectAiError(
      run(async () => jsonResponse({ error: { code: 429, message: "slow down" } })),
      "RATE_LIMITED",
    );
    await expectAiError(
      run(async () =>
        jsonResponse({
          choices: [
            {
              message: { content: "partial" },
              finish_reason: "error",
              error: { code: 502, message: "Provider disconnected" },
            },
          ],
        }),
      ),
      "UPSTREAM",
    );
    await expectAiError(
      run(async () =>
        jsonResponse({ choices: [{ message: { content: "partial" }, finish_reason: "error" }] }),
      ),
      "UPSTREAM",
    );
  });
});
