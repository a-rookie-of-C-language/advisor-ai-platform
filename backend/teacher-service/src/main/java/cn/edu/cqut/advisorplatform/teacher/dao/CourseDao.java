package cn.edu.cqut.advisorplatform.teacher.dao;

import cn.edu.cqut.advisorplatform.teacher.entity.Course;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseDao extends JpaRepository<Course, Long> {
  Optional<Course> findByIdAndDeleted(Long id, Integer deleted);
}
