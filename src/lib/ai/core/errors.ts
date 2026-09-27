import "server-only";

export const AI_ERROR_CODES = [
  /** 429: OpenRouter or the model's provider is rate limiting (free: 20/min, 50/day). */
  "RATE_LIMITED",
  /** 402: not enough credits for the request. */
  "PAYMENT_REQUIRED",
  /** 401/403: the key is invalid, disabled, or the input was refused by moderation. */
  "AUTH",
  /** 400: the request itself is wrong (e.g. an unsupported parameter for this model). */
  "BAD_REQUEST",
  /** Our timeout or OpenRouter's 408. */
  "TIMEOUT",
  /** 5xx, or an error reported inside a 200 response. */
  "UPSTREAM",
  /** The request never got an HTTP response. */
  "NETWORK",
  /** A 200 whose body is not a chat completion. */
  "INVALID_RESPONSE",
] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

/**
 * A failed OpenRouter call. Like MarketDataError, the message is written here and is safe to
 * log: it never holds the URL, headers, key, prompt or response body, and there is no `cause`.
 */
export class AiError extends Error {
  override readonly name = "AiError";
  readonly code: AiErrorCode;
  /** The HTTP status when there was one. */
  readonly status: number | null;

  constructor(code: AiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function isAiError(error: unknown): error is AiError {
  return error instanceof AiError;
}

/** Our own per-IP limit refused an uncached analysis. Maps to 429 AI_BUSY. */
export class AiBusyError extends Error {
  override readonly name = "AiBusyError";
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Analysis limit reached for this client");
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}
