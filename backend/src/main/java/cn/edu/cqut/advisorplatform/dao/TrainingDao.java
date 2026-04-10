package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.Training;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingDao extends JpaRepository<Training, Long> {

    Page<Training> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Training> findByType(String type, Pageable pageable);
}
