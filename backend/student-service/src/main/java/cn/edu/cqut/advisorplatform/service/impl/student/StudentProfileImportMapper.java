package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import java.time.LocalDateTime;

class StudentProfileImportMapper {

  StudentProfile create(StudentImportData data, String operator, LocalDateTime now) {
    StudentProfile profile = new StudentProfile();
    profile.setStudentNo(data.studentNo);
    applyImportedFields(profile, data);
    profile.setCreatedBy(operator);
    profile.setCreatedAt(now);
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(now);
    profile.setDeleted(0);
    return profile;
  }

  void update(StudentProfile profile, StudentImportData data, String operator, LocalDateTime now) {
    applyImportedFields(profile, data);
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(now);
  }

  private void applyImportedFields(StudentProfile profile, StudentImportData data) {
    profile.setName(data.name);
    profile.setGender(data.gender);
    profile.setGrade(data.grade);
    profile.setMajor(data.major);
    profile.setClassCode(data.classCode);
    profile.setCounselorNo(data.counselorNo);
    profile.setPhone(data.phone);
    profile.setEmail(data.email);
    profile.setDormitory(data.dormitory);
    profile.setEmergencyContact(data.emergencyContact);
  }
}
