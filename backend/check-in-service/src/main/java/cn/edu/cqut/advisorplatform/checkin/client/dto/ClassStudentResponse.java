package cn.edu.cqut.advisorplatform.checkin.client.dto;

import lombok.Data;

@Data
public class ClassStudentResponse {
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String classCode;
}
