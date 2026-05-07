package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.StudentFieldChange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentFieldChangeDao extends JpaRepository<StudentFieldChange, Long> {

  @Query(
      "SELECT c FROM StudentFieldChange c WHERE c.student.id = :studentId ORDER BY c.changedAt DESC")
  Page<StudentFieldChange> findByStudentIdOrderByChangedAtDesc(
      @Param("studentId") Long studentId, Pageable pageable);

  @Query("SELECT c FROM StudentFieldChange c WHERE c.batchNo = :batchNo ORDER BY c.changedAt DESC")
  Page<StudentFieldChange> findByBatchNoOrderByChangedAtDesc(
      @Param("batchNo") String batchNo, Pageable pageable);
}
