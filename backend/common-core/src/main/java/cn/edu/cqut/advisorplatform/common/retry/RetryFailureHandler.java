package cn.edu.cqut.advisorplatform.common.retry;

@FunctionalInterface
public interface RetryFailureHandler {

  void onFailure(int attempt, int maxAttempts, Exception error);
}
