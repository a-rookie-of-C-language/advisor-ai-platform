package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.StudentFieldChangeDao;
import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.dto.request.StudentCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.StudentDetailResponse;
import cn.edu.cqut.advisorplatform.entity.StudentFieldChange;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.enums.InfoCompleteness;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import cn.edu.cqut.advisorplatform.service.StudentService;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentServiceImpl implements StudentService {

  private final StudentProfileDao studentProfileDao;
  private final StudentFieldChangeDao fieldChangeDao;

  public StudentServiceImpl(
      StudentProfileDao studentProfileDao, StudentFieldChangeDao fieldChangeDao) {
    this.studentProfileDao = studentProfileDao;
    this.fieldChangeDao = fieldChangeDao;
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

    StudentProfile profile = new StudentProfile();
    profile.setStudentNo(request.getStudentNo());
    profile.setName(request.getName());
    profile.setGender(request.getGender());
    profile.setGrade(request.getGrade());
    profile.setMajor(request.getMajor());
    profile.setClassCode(request.getClassCode());
    profile.setCounselorNo(request.getCounselorNo());
    profile.setPhone(request.getPhone());
    profile.setEmail(request.getEmail());
    profile.setDormitory(request.getDormitory());
    profile.setEmergencyContact(request.getEmergencyContact());
    profile.setCreatedBy(operator);
    profile.setCreatedAt(LocalDateTime.now());
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());
    profile.setDeleted(0);

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

    recordFieldChanges(profile, request, operator);

    profile.setStudentNo(request.getStudentNo());
    profile.setName(request.getName());
    profile.setGender(request.getGender());
    profile.setGrade(request.getGrade());
    profile.setMajor(request.getMajor());
    profile.setClassCode(request.getClassCode());
    profile.setCounselorNo(request.getCounselorNo());
    profile.setPhone(request.getPhone());
    profile.setEmail(request.getEmail());
    profile.setDormitory(request.getDormitory());
    profile.setEmergencyContact(request.getEmergencyContact());
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());

    calculateAndUpdateInfoCompleteness(profile);

    StudentProfile saved = studentProfileDao.save(profile);
    return StudentDetailResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public void deleteStudent(Long id, String operator) {
    StudentProfile profile =
        studentProfileDao.findById(id).orElseThrow(() -> new BusinessException("学生不存在"));
    profile.setDeleted(1);
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());
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
  public void calculateAndUpdateInfoCompleteness(StudentProfile profile) {
    InfoCompleteness completeness = profile.calculateInfoCompleteness();
    profile.setInfoCompleteness(completeness.getCode());
  }

  private void recordFieldChanges(
      StudentProfile profile, StudentUpdateRequest request, String operator) {
    recordChange(
        profile, "name", profile.getName(), request.getName(), request.getChangeReason(), operator);
    recordChange(
        profile,
        "gender",
        String.valueOf(profile.getGender()),
        String.valueOf(request.getGender()),
        request.getChangeReason(),
        operator);
    recordChange(
        profile,
        "classCode",
        profile.getClassCode(),
        request.getClassCode(),
        request.getChangeReason(),
        operator);
    recordChange(
        profile,
        "counselorNo",
        profile.getCounselorNo(),
        request.getCounselorNo(),
        request.getChangeReason(),
        operator);
    recordChange(
        profile,
        "phone",
        profile.getPhone(),
        request.getPhone(),
        request.getChangeReason(),
        operator);
    recordChange(
        profile,
        "email",
        profile.getEmail(),
        request.getEmail(),
        request.getChangeReason(),
        operator);
  }

  private void recordChange(
      StudentProfile profile,
      String fieldName,
      String oldValue,
      String newValue,
      String reason,
      String operator) {
    if ((oldValue == null && newValue == null) || (oldValue != null && oldValue.equals(newValue))) {
      return;
    }

    StudentFieldChange change = new StudentFieldChange();
    change.setStudent(profile);
    change.setStudentNo(profile.getStudentNo());
    change.setFieldName(fieldName);
    change.setOldValue(oldValue);
    change.setNewValue(newValue);
    change.setChangeReason(reason);
    change.setChangedBy(operator);
    change.setChangedAt(LocalDateTime.now());
    fieldChangeDao.save(change);
  }

  public Optional<StudentProfile> findByStudentNo(String studentNo) {
    return studentProfileDao.findByStudentNo(studentNo);
  }
}
