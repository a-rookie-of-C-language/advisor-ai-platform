package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.StudentFieldChangeDao;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.entity.StudentFieldChange;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
public class StudentFieldChangeSupport {

  private final StudentFieldChangeDao fieldChangeDao;

  public StudentFieldChangeSupport(StudentFieldChangeDao fieldChangeDao) {
    this.fieldChangeDao = fieldChangeDao;
  }

  public void recordFieldChanges(
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
}
