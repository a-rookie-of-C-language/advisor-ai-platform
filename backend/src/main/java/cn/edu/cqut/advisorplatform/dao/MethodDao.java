package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.Method;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MethodDao extends JpaRepository<Method, Long> {

    Page<Method> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Method> findByScenario(String scenario, Pageable pageable);
}
