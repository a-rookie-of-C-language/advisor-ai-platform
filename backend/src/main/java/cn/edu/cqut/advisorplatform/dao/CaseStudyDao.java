package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.CaseStudy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CaseStudyDao extends JpaRepository<CaseStudy, Long> {

    @Query("SELECT c FROM CaseStudy c WHERE " +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.tags) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<CaseStudy> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    Page<CaseStudy> findByCategory(String category, Pageable pageable);
}
