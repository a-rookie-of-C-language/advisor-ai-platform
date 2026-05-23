package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import lombok.Data;

@Data
public class StudentClassResponse {
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String classCode;
  private String grade;
  private String major;

  public static StudentClassResponse from(StudentProfile student) {
    StudentClassResponse response = new StudentClassResponse();
    response.setStudentId(student.getId());
    response.setStudentNo(student.getStudentNo());
    response.setStudentName(student.getName());
    response.setClassCode(student.getClassCode());
    response.setGrade(student.getGrade());
    response.setMajor(student.getMajor());
    return response;
  }
}
