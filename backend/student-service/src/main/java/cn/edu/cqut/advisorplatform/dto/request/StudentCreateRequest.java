package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;

public class StudentCreateRequest {

  @NotBlank(message = "学号不能为空")
  private String studentNo;

  @NotBlank(message = "姓名不能为空")
  private String name;

  private Integer gender;

  private String grade;

  private String major;

  private String classCode;

  private String counselorNo;

  private String phone;

  private String email;

  private String dormitory;

  private String emergencyContact;

  public String getStudentNo() {
    return studentNo;
  }

  public void setStudentNo(String studentNo) {
    this.studentNo = studentNo;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public Integer getGender() {
    return gender;
  }

  public void setGender(Integer gender) {
    this.gender = gender;
  }

  public String getGrade() {
    return grade;
  }

  public void setGrade(String grade) {
    this.grade = grade;
  }

  public String getMajor() {
    return major;
  }

  public void setMajor(String major) {
    this.major = major;
  }

  public String getClassCode() {
    return classCode;
  }

  public void setClassCode(String classCode) {
    this.classCode = classCode;
  }

  public String getCounselorNo() {
    return counselorNo;
  }

  public void setCounselorNo(String counselorNo) {
    this.counselorNo = counselorNo;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getDormitory() {
    return dormitory;
  }

  public void setDormitory(String dormitory) {
    this.dormitory = dormitory;
  }

  public String getEmergencyContact() {
    return emergencyContact;
  }

  public void setEmergencyContact(String emergencyContact) {
    this.emergencyContact = emergencyContact;
  }
}
