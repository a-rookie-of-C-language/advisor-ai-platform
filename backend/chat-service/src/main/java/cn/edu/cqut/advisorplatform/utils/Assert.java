package cn.edu.cqut.advisorplatform.utils;

import java.util.function.Supplier;

public final class Assert {
<<<<<<< HEAD
  private Assert() {
    throw new AssertionError("Utility class");
  }

  public static void notNull(
      Object object, Supplier<? extends RuntimeException> exceptionSupplier) {
    if (object == null) {
      throw exceptionSupplier.get();
    }
  }

  public static void isTrue(
      boolean expression, Supplier<? extends RuntimeException> exceptionSupplier) {
    if (!expression) {
      throw exceptionSupplier.get();
    }
  }

  public static void notBlank(String text, Supplier<? extends RuntimeException> exceptionSupplier) {
    if (text == null || text.trim().isEmpty()) {
      throw exceptionSupplier.get();
    }
  }
=======
    private Assert() {
        throw new AssertionError("Utility class");
    }

    public static void notNull(Object object, Supplier<? extends RuntimeException> exceptionSupplier) {
        if (object == null) {
            throw exceptionSupplier.get();
        }
    }

    public static void isTrue(boolean expression, Supplier<? extends RuntimeException> exceptionSupplier) {
        if (!expression) {
            throw exceptionSupplier.get();
        }
    }

    public static void notBlank(String text, Supplier<? extends RuntimeException> exceptionSupplier) {
        if (text == null || text.trim().isEmpty()) {
            throw exceptionSupplier.get();
        }
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
