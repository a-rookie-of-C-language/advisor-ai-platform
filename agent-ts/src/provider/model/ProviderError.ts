import { isRetryableProviderError, type ProviderErrorCode } from "./ProviderErrorCode.js";

export class ProviderError extends Error {
  readonly retryable: boolean;

  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    options?: { cause?: unknown; retryable?: boolean }
  ) {
    super(message, options);
    this.name = "ProviderError";
    this.retryable = options?.retryable ?? isRetryableProviderError(code);
  }
}
