package cn.edu.cqut.advisorplatform.service.impl.student;

import static org.junit.jupiter.api.Assertions.assertEquals;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class StudentProfileImportMapperTest {

  private final StudentProfileImportMapper mapper = new StudentProfileImportMapper();

  @Test
  void createMapsImportedFieldsAndAuditFields() {
    StudentImportData data = sampleImportData();
    LocalDateTime now = LocalDateTime.of(2026, 5, 25, 10, 30);

    StudentProfile profile = mapper.create(data, "operator-1", now);

    assertEquals("20260001", profile.getStudentNo());
    assertEquals("张三", profile.getName());
    assertEquals(1, profile.getGender());
    assertEquals("2026", profile.getGrade());
    assertEquals("软件工程", profile.getMajor());
    assertEquals("软件2601", profile.getClassCode());
    assertEquals("T001", profile.getCounselorNo());
    assertEquals("13800000000", profile.getPhone());
    assertEquals("student@example.com", profile.getEmail());
    assertEquals("A-101", profile.getDormitory());
    assertEquals("家长 13900000000", profile.getEmergencyContact());
    assertEquals("operator-1", profile.getCreatedBy());
    assertEquals(now, profile.getCreatedAt());
    assertEquals("operator-1", profile.getUpdatedBy());
    assertEquals(now, profile.getUpdatedAt());
    assertEquals(0, profile.getDeleted());
  }

  @Test
  void updateKeepsStudentNoAndCreatedFields() {
    StudentProfile profile = new StudentProfile();
    profile.setStudentNo("original-no");
    profile.setCreatedBy("creator");
    LocalDateTime createdAt = LocalDateTime.of(2026, 1, 1, 9, 0);
    profile.setCreatedAt(createdAt);
    StudentImportData data = sampleImportData();
    data.studentNo = "new-no";
    data.name = "李四";
    LocalDateTime now = LocalDateTime.of(2026, 5, 25, 11, 0);

    mapper.update(profile, data, "operator-2", now);

    assertEquals("original-no", profile.getStudentNo());
    assertEquals("creator", profile.getCreatedBy());
    assertEquals(createdAt, profile.getCreatedAt());
    assertEquals("李四", profile.getName());
    assertEquals("operator-2", profile.getUpdatedBy());
    assertEquals(now, profile.getUpdatedAt());
  }

  private StudentImportData sampleImportData() {
    StudentImportData data = new StudentImportData();
    data.studentNo = "20260001";
    data.name = "张三";
    data.gender = 1;
    data.grade = "2026";
    data.major = "软件工程";
    data.classCode = "软件2601";
    data.counselorNo = "T001";
    data.phone = "13800000000";
    data.email = "student@example.com";
    data.dormitory = "A-101";
    data.emergencyContact = "家长 13900000000";
    return data;
  }
}
