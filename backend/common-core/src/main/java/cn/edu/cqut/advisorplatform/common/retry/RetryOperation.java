package cn.edu.cqut.advisorplatform.common.retry;

@FunctionalInterface
public interface RetryOperation {

  void run() throws Exception;
}
