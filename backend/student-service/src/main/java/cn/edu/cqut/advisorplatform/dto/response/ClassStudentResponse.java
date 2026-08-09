package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import lombok.Data;

@Data
public class ClassStudentResponse {
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String classCode;

  public static ClassStudentResponse from(StudentProfile student) {
    ClassStudentResponse response = new ClassStudentResponse();
    response.setStudentId(student.getId());
    response.setStudentNo(student.getStudentNo());
    response.setStudentName(student.getName());
    response.setClassCode(student.getClassCode());
    return response;
  }
}
