package cn.edu.cqut.advisorplatform.memoryservice.dao;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class UserMemoryDaoTest {

  @Test
  void searchByScope_shouldExposeMybatisPaginationArguments() throws Exception {
    Method method =
        UserMemoryDao.class.getMethod(
            "searchByScope",
            Long.class,
            Long.class,
            String.class,
            java.time.LocalDateTime.class,
            int.class,
            int.class);

    assertThat(method).isNotNull();
    assertThat(method.getParameterCount()).isEqualTo(6);
  }
}
