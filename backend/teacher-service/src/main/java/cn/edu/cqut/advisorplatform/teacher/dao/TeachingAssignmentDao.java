package cn.edu.cqut.advisorplatform.teacher.dao;

import cn.edu.cqut.advisorplatform.teacher.entity.TeachingAssignment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeachingAssignmentDao extends JpaRepository<TeachingAssignment, Long> {
  boolean existsByTeacherNoAndCourseIdAndClassCodeAndStatusAndDeleted(
      String teacherNo, Long courseId, String classCode, String status, Integer deleted);

  List<TeachingAssignment> findByTeacherNoAndCourseIdAndStatusAndDeleted(
      String teacherNo, Long courseId, String status, Integer deleted);
}
