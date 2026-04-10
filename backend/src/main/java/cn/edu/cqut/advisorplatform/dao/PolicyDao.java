package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.Policy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyDao extends JpaRepository<Policy, Long> {

    Page<Policy> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Policy> findByCategory(String category, Pageable pageable);
}
