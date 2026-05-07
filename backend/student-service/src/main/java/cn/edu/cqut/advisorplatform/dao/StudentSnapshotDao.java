package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.entity.StudentSnapshot;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentSnapshotDao extends JpaRepository<StudentSnapshot, Long> {

  List<StudentSnapshot> findByStudentOrderByCreatedAtDesc(StudentProfile student);

  List<StudentSnapshot> findByStudentNoOrderByCreatedAtDesc(String studentNo);

  List<StudentSnapshot> findBySemesterOrderByCreatedAtDesc(String semester);
}
