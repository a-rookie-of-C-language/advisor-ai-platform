package cn.edu.cqut.advisorplatform.common.retry;

public class FixedBackoffRetryExecutor {

  private final int maxAttempts;
  private final long backoffMs;

  public FixedBackoffRetryExecutor(int maxAttempts, long backoffMs) {
    if (maxAttempts < 1) {
      throw new IllegalArgumentException("maxAttempts must be greater than 0");
    }
    if (backoffMs < 0) {
      throw new IllegalArgumentException("backoffMs must not be negative");
    }
    this.maxAttempts = maxAttempts;
    this.backoffMs = backoffMs;
  }

  public Exception execute(RetryOperation operation, RetryFailureHandler failureHandler) {
    Exception lastError = null;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        operation.run();
        return null;
      } catch (Exception error) {
        lastError = error;
        failureHandler.onFailure(attempt, maxAttempts, error);
        if (attempt < maxAttempts && !sleepBackoff()) {
          return lastError;
        }
      }
    }
    return lastError;
  }

  private boolean sleepBackoff() {
    if (backoffMs == 0) {
      return true;
    }
    try {
      Thread.sleep(backoffMs);
      return true;
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      return false;
    }
  }
}
