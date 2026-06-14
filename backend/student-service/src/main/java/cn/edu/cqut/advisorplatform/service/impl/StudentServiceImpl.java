package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.dto.request.StudentCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentDetailResponse;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.enums.InfoCompleteness;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import cn.edu.cqut.advisorplatform.service.StudentCheckInService;
import cn.edu.cqut.advisorplatform.service.StudentService;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentServiceImpl implements StudentService, StudentCheckInService {

  private final StudentProfileDao studentProfileDao;
  private final StudentFieldChangeSupport fieldChangeSupport;
  private final StudentCheckInQuerySupport checkInQuerySupport;
  private final StudentProfileMutationSupport mutationSupport;

  public StudentServiceImpl(
      StudentProfileDao studentProfileDao,
      StudentFieldChangeSupport fieldChangeSupport,
      StudentCheckInQuerySupport checkInQuerySupport,
      StudentProfileMutationSupport mutationSupport) {
    this.studentProfileDao = studentProfileDao;
    this.fieldChangeSupport = fieldChangeSupport;
    this.checkInQuerySupport = checkInQuerySupport;
    this.mutationSupport = mutationSupport;
  }

  @Override
  public Page<StudentDetailResponse> queryStudents(StudentQueryRequest request) {
    PageRequest pageRequest =
        PageRequest.of(
            request.getPage(), request.getSize(), Sort.by(Sort.Direction.DESC, "createdAt"));

    Page<StudentProfile> page =
        studentProfileDao.findByConditions(
            request.getClassCode(),
            request.getCounselorNo(),
            request.getGrade(),
            request.getInfoCompleteness(),
            request.getRiskLevel(),
            request.getKeyword(),
            pageRequest);

    return page.map(StudentDetailResponse::fromEntity);
  }

  @Override
  public StudentDetailResponse getStudentById(Long id) {
    StudentProfile profile =
        studentProfileDao.findById(id).orElseThrow(() -> new BusinessException("学生不存在"));
    return StudentDetailResponse.fromEntity(profile);
  }

  @Override
  @Transactional
  public StudentDetailResponse createStudent(StudentCreateRequest request, String operator) {
    if (studentProfileDao.existsByStudentNoAndDeleted(request.getStudentNo(), 0)) {
      throw new BusinessException("学号已存在");
    }

    StudentProfile profile = mutationSupport.create(request, operator);

    calculateAndUpdateInfoCompleteness(profile);

    StudentProfile saved = studentProfileDao.save(profile);
    return StudentDetailResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public StudentDetailResponse updateStudent(StudentUpdateRequest request, String operator) {
    StudentProfile profile =
        studentProfileDao
            .findById(request.getId())
            .orElseThrow(() -> new BusinessException("学生不存在"));

    fieldChangeSupport.recordFieldChanges(profile, request, operator);

    mutationSupport.update(profile, request, operator);

    calculateAndUpdateInfoCompleteness(profile);

    StudentProfile saved = studentProfileDao.save(profile);
    return StudentDetailResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public void deleteStudent(Long id, String operator) {
    StudentProfile profile =
        studentProfileDao.findById(id).orElseThrow(() -> new BusinessException("学生不存在"));
    mutationSupport.markDeleted(profile, operator);
    studentProfileDao.save(profile);
  }

  @Override
  public StudentProfile getStudentEntityById(Long id) {
    return studentProfileDao.findById(id).orElseThrow(() -> new BusinessException("学生不存在"));
  }

  @Override
  public StudentProfile getStudentEntityByStudentNo(String studentNo) {
    return studentProfileDao
        .findByStudentNo(studentNo)
        .orElseThrow(() -> new BusinessException("学号不存在"));
  }

  @Override
  public List<StudentProfile> listStudentEntitiesByClassCode(String classCode) {
    return studentProfileDao.findByClassCodeAndDeletedOrderByStudentNoAsc(classCode, 0);
  }

  @Override
  public void calculateAndUpdateInfoCompleteness(StudentProfile profile) {
    InfoCompleteness completeness = profile.calculateInfoCompleteness();
    profile.setInfoCompleteness(completeness.getCode());
  }

  @Override
  public StudentCheckInSummaryResponse getStudentCheckInSummary(Long studentId) {
    return checkInQuerySupport.getStudentCheckInSummary(studentId);
  }

  @Override
  public StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, int limit) {
    return checkInQuerySupport.getStudentCheckInDetail(studentId, limit);
  }

  @Override
  public List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(
      String keyword, int page, int size) {
    return checkInQuerySupport.listStudentCheckInSummaries(keyword, page, size);
  }

  public Optional<StudentProfile> findByStudentNo(String studentNo) {
    return studentProfileDao.findByStudentNo(studentNo);
  }
}
