package cn.edu.cqut.advisorplatform.memoryservice.dao;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class UserMemoryDaoTest {

  @Test
  void searchByScope_shouldSupportAllKnowledgeBasesWhenKbIdIsZero() throws Exception {
    Method method =
        UserMemoryDao.class.getMethod(
            "searchByScope",
            Long.class,
            Long.class,
            String.class,
            java.time.LocalDateTime.class,
            org.springframework.data.domain.Pageable.class);

    Query query = method.getAnnotation(Query.class);
    assertThat(query).isNotNull();
    assertThat(query.value()).contains("(:kbId = 0 OR m.kbId = :kbId)");
  }
}
