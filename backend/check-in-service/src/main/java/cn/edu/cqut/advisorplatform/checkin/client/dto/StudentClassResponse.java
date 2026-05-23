package cn.edu.cqut.advisorplatform.checkin.client.dto;

import lombok.Data;

@Data
public class StudentClassResponse {
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String classCode;
  private String grade;
  private String major;
}
