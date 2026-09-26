export const MARKET_DATA_ERROR_CODES = [
  "RATE_LIMITED",
  "UPSTREAM",
  "INVALID_RESPONSE",
  "NOT_FOUND",
  "CONFIG",
] as const;

export type MarketDataErrorCode = (typeof MARKET_DATA_ERROR_CODES)[number];

/**
 * Error thrown by market data providers. The message may reach logs and API responses, so it must
 * never contain secrets, request URLs (they can carry keys) or raw upstream bodies. There is no
 * `cause` for the same reason: an upstream error object can hold the full request.
 */
export class MarketDataError extends Error {
  override readonly name = "MarketDataError";
  readonly code: MarketDataErrorCode;

  constructor(code: MarketDataErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function isMarketDataError(error: unknown): error is MarketDataError {
  return error instanceof MarketDataError;
}
