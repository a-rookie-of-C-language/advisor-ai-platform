package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.dto.request.StudentCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
class StudentProfileMutationSupport {

  StudentProfile create(StudentCreateRequest request, String operator) {
    StudentProfile profile = new StudentProfile();
    applyCommonFields(profile, request);
    profile.setCreatedBy(operator);
    profile.setCreatedAt(LocalDateTime.now());
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());
    profile.setDeleted(0);
    return profile;
  }

  void update(StudentProfile profile, StudentUpdateRequest request, String operator) {
    applyCommonFields(profile, request);
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());
  }

  void markDeleted(StudentProfile profile, String operator) {
    profile.setDeleted(1);
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());
  }

  private void applyCommonFields(StudentProfile profile, StudentCreateRequest request) {
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
  }

  private void applyCommonFields(StudentProfile profile, StudentUpdateRequest request) {
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
  }
}
