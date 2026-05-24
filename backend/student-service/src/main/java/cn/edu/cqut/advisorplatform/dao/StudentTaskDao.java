package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.StudentTask;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentTaskDao extends JpaRepository<StudentTask, Long> {

  @Query(
      "SELECT t FROM StudentTask t WHERE 1=1 "
          + "AND (:assigneeNo IS NULL OR t.assigneeNo = :assigneeNo) "
          + "AND (:taskStatus IS NULL OR t.taskStatus = :taskStatus) "
          + "AND (:taskType IS NULL OR t.taskType = :taskType) "
          + "AND (:studentId IS NULL OR t.student.id = :studentId)")
  Page<StudentTask> findByConditions(
      @Param("assigneeNo") String assigneeNo,
      @Param("taskStatus") Integer taskStatus,
      @Param("taskType") String taskType,
      @Param("studentId") Long studentId,
      Pageable pageable);

  @Query(
      "SELECT t FROM StudentTask t WHERE t.student.id = :studentId "
          + "AND t.taskType = :taskType AND t.taskStatus NOT IN (2, 3)")
  Optional<StudentTask> findOpenTaskByStudentAndType(
      @Param("studentId") Long studentId, @Param("taskType") String taskType);

  @Query(
      "SELECT COUNT(t) FROM StudentTask t WHERE t.assigneeNo = :assigneeNo AND t.taskStatus = :taskStatus")
  long countByAssigneeNoAndStatus(
      @Param("assigneeNo") String assigneeNo, @Param("taskStatus") Integer taskStatus);

  @Query("SELECT COUNT(t) FROM StudentTask t WHERE t.taskStatus NOT IN (2, 3)")
  long countAllOpenTasks();

  @Query(
      "SELECT t.taskType, COUNT(t) FROM StudentTask t WHERE t.taskStatus = :taskStatus GROUP BY t.taskType")
  List<Object[]> countByTaskType(@Param("taskStatus") Integer taskStatus);

  @Query("SELECT t FROM StudentTask t WHERE t.student.id = :studentId ORDER BY t.createdAt DESC")
  Page<StudentTask> findByStudentId(@Param("studentId") Long studentId, Pageable pageable);
}
