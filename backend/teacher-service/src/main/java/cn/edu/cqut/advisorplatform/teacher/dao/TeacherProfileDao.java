package cn.edu.cqut.advisorplatform.teacher.dao;

import cn.edu.cqut.advisorplatform.teacher.entity.TeacherProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherProfileDao extends JpaRepository<TeacherProfile, Long> {
  Optional<TeacherProfile> findByTeacherNoAndDeleted(String teacherNo, Integer deleted);
}
