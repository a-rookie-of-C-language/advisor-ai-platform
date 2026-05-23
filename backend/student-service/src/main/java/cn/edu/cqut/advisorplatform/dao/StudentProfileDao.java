package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentProfileDao extends JpaRepository<StudentProfile, Long> {

  Optional<StudentProfile> findByStudentNoAndDeleted(String studentNo, Integer deleted);

  Optional<StudentProfile> findByStudentNo(String studentNo);

  boolean existsByStudentNoAndDeleted(String studentNo, Integer deleted);

  @Query(
      "SELECT s FROM StudentProfile s WHERE s.deleted = 0 "
          + "AND (:classCode IS NULL OR s.classCode = :classCode) "
          + "AND (:counselorNo IS NULL OR s.counselorNo = :counselorNo) "
          + "AND (:grade IS NULL OR s.grade = :grade) "
          + "AND (:infoCompleteness IS NULL OR s.infoCompleteness = :infoCompleteness) "
          + "AND (:riskLevel IS NULL OR s.riskLevel = :riskLevel) "
          + "AND (:keyword IS NULL OR s.name LIKE %:keyword% OR s.studentNo LIKE %:keyword%)")
  Page<StudentProfile> findByConditions(
      @Param("classCode") String classCode,
      @Param("counselorNo") String counselorNo,
      @Param("grade") String grade,
      @Param("infoCompleteness") Integer infoCompleteness,
      @Param("riskLevel") Integer riskLevel,
      @Param("keyword") String keyword,
      Pageable pageable);

  @Query("SELECT COUNT(s) FROM StudentProfile s WHERE s.deleted = 0")
  long countAllActive();

  @Query(
      "SELECT COUNT(s) FROM StudentProfile s WHERE s.deleted = 0 " + "AND s.infoCompleteness > 0")
  long countByInfoMissing();

  @Query(
      "SELECT DISTINCT s.classCode FROM StudentProfile s WHERE s.deleted = 0 AND s.classCode IS NOT NULL")
  java.util.List<String> findAllClassCodes();

  @Query(
      "SELECT DISTINCT s.counselorNo FROM StudentProfile s WHERE s.deleted = 0 AND s.counselorNo IS NOT NULL")
  java.util.List<String> findAllCounselorNos();
}
