package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.enums.InfoCompleteness;
import cn.edu.cqut.advisorplatform.enums.RiskLevel;
import java.time.LocalDateTime;

public class StudentDetailResponse {

  private Long id;
  private String studentNo;
  private String name;
  private Integer gender;
  private String genderText;
  private String grade;
  private String major;
  private String classCode;
  private String counselorNo;
  private String phone;
  private String email;
  private String dormitory;
  private String emergencyContact;
  private Integer infoCompleteness;
  private String infoCompletenessText;
  private Integer riskLevel;
  private String riskLevelText;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static StudentDetailResponse fromEntity(StudentProfile entity) {
    StudentDetailResponse response = new StudentDetailResponse();
    response.setId(entity.getId());
    response.setStudentNo(entity.getStudentNo());
    response.setName(entity.getName());
    response.setGender(entity.getGender());
    response.setGenderText(entity.getGender() == 1 ? "男" : "女");
    response.setGrade(entity.getGrade());
    response.setMajor(entity.getMajor());
    response.setClassCode(entity.getClassCode());
    response.setCounselorNo(entity.getCounselorNo());
    response.setPhone(entity.getPhone());
    response.setEmail(entity.getEmail());
    response.setDormitory(entity.getDormitory());
    response.setEmergencyContact(entity.getEmergencyContact());
    response.setInfoCompleteness(entity.getInfoCompleteness());
    InfoCompleteness ic = InfoCompleteness.fromCode(entity.getInfoCompleteness());
    response.setInfoCompletenessText(ic.getDescription());
    response.setRiskLevel(entity.getRiskLevel());
    RiskLevel rl = RiskLevel.fromCode(entity.getRiskLevel());
    response.setRiskLevelText(rl.getDescription());
    response.setCreatedAt(entity.getCreatedAt());
    response.setUpdatedAt(entity.getUpdatedAt());
    return response;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

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

  public String getGenderText() {
    return genderText;
  }

  public void setGenderText(String genderText) {
    this.genderText = genderText;
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

  public Integer getInfoCompleteness() {
    return infoCompleteness;
  }

  public void setInfoCompleteness(Integer infoCompleteness) {
    this.infoCompleteness = infoCompleteness;
  }

  public String getInfoCompletenessText() {
    return infoCompletenessText;
  }

  public void setInfoCompletenessText(String infoCompletenessText) {
    this.infoCompletenessText = infoCompletenessText;
  }

  public Integer getRiskLevel() {
    return riskLevel;
  }

  public void setRiskLevel(Integer riskLevel) {
    this.riskLevel = riskLevel;
  }

  public String getRiskLevelText() {
    return riskLevelText;
  }

  public void setRiskLevelText(String riskLevelText) {
    this.riskLevelText = riskLevelText;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
