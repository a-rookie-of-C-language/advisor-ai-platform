export const PROVIDER_ERROR_CODES = [
  "AUTH",
  "RATE_LIMIT",
  "SERVER",
  "TIMEOUT",
  "TRANSPORT",
  "QUOTA",
  "CONTEXT_WINDOW_EXCEEDED",
  "INVALID_REQUEST",
  "EMPTY_RESPONSE",
  "CANCELLED"
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

export function isRetryableProviderError(code: ProviderErrorCode): boolean {
  return code === "RATE_LIMIT" || code === "SERVER" || code === "TIMEOUT" ||
    code === "TRANSPORT" || code === "EMPTY_RESPONSE";
}
