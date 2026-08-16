import type { ProviderError } from "./ProviderError.js";

export class ProviderRetryPolicy {
  constructor(
    readonly maxAttempts = 3,
    readonly baseDelayMs = 100,
    readonly maxDelayMs = 2_000
  ) {}

  allowsRetry(attempt: number, error: ProviderError, streamStarted: boolean): boolean {
    return error.retryable && !streamStarted && attempt < this.maxAttempts;
  }

  delayMs(attempt: number): number {
    const exponent = Math.min(Math.max(attempt - 1, 0), 10);
    return Math.min(this.baseDelayMs * 2 ** exponent, this.maxDelayMs);
  }
}
