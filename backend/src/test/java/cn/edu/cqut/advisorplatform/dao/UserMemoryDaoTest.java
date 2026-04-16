package cn.edu.cqut.advisorplatform.dao;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class UserMemoryDaoTest {

    @Test
    void searchByScope_shouldSupportAllKnowledgeBasesWhenKbIdIsZero() throws Exception {
        Method method = UserMemoryDao.class.getMethod(
                "searchByScope",
                Long.class,
                Long.class,
                String.class,
                java.time.LocalDateTime.class,
                org.springframework.data.domain.Pageable.class
        );

        Query query = method.getAnnotation(Query.class);
        assertThat(query).isNotNull();
        assertThat(query.value()).contains("(:kbId = 0 OR m.kbId = :kbId)");
    }
}
