package cn.edu.cqut.advisorplatform.entity;

import cn.edu.cqut.advisorplatform.enums.InfoCompleteness;
import cn.edu.cqut.advisorplatform.enums.RiskLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "student_profile",
    indexes = {
      @Index(name = "idx_student_class_code", columnList = "class_code"),
      @Index(name = "idx_student_counselor_no", columnList = "counselor_no"),
      @Index(name = "idx_student_grade", columnList = "grade"),
      @Index(name = "idx_student_info_completeness", columnList = "info_completeness"),
      @Index(name = "idx_student_risk_level", columnList = "risk_level"),
      @Index(name = "idx_student_deleted", columnList = "deleted")
    })
public class StudentProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "student_no", nullable = false, unique = true, length = 32)
  private String studentNo;

  @Column(name = "name", nullable = false, length = 64)
  private String name;

  @Column(name = "gender")
  private Integer gender;

  @Column(name = "grade", length = 16)
  private String grade;

  @Column(name = "major", length = 128)
  private String major;

  @Column(name = "class_code", length = 64)
  private String classCode;

  @Column(name = "counselor_no", length = 32)
  private String counselorNo;

  @Column(name = "phone", length = 32)
  private String phone;

  @Column(name = "email", length = 128)
  private String email;

  @Column(name = "dormitory", length = 128)
  private String dormitory;

  @Column(name = "emergency_contact", length = 256)
  private String emergencyContact;

  @Column(name = "extra_data", columnDefinition = "jsonb")
  private String extraData;

  @Column(name = "info_completeness")
  private Integer infoCompleteness = InfoCompleteness.COMPLETE.getCode();

  @Column(name = "risk_level")
  private Integer riskLevel = RiskLevel.NORMAL.getCode();

  @Column(name = "created_by", length = 64)
  private String createdBy;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_by", length = 64)
  private String updatedBy;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Column(name = "deleted")
  private Integer deleted = 0;

  @Version
  @Column(name = "version")
  private Integer version = 0;

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

  public String getExtraData() {
    return extraData;
  }

  public void setExtraData(String extraData) {
    this.extraData = extraData;
  }

  public Integer getInfoCompleteness() {
    return infoCompleteness;
  }

  public void setInfoCompleteness(Integer infoCompleteness) {
    this.infoCompleteness = infoCompleteness;
  }

  public Integer getRiskLevel() {
    return riskLevel;
  }

  public void setRiskLevel(Integer riskLevel) {
    this.riskLevel = riskLevel;
  }

  public String getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(String createdBy) {
    this.createdBy = createdBy;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public String getUpdatedBy() {
    return updatedBy;
  }

  public void setUpdatedBy(String updatedBy) {
    this.updatedBy = updatedBy;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public Integer getDeleted() {
    return deleted;
  }

  public void setDeleted(Integer deleted) {
    this.deleted = deleted;
  }

  public Integer getVersion() {
    return version;
  }

  public void setVersion(Integer version) {
    this.version = version;
  }

  public boolean isInfoMissing() {
    boolean hasPhone = phone != null && !phone.isBlank();
    boolean hasEmail = email != null && !email.isBlank();
    boolean hasDormitory = dormitory != null && !dormitory.isBlank();
    boolean hasEmergency = emergencyContact != null && !emergencyContact.isBlank();
    return !hasPhone && !hasEmail && !hasDormitory && !hasEmergency;
  }

  public InfoCompleteness calculateInfoCompleteness() {
    int filledCount = 0;
    if (phone != null && !phone.isBlank()) {
      filledCount++;
    }
    if (email != null && !email.isBlank()) {
      filledCount++;
    }
    if (dormitory != null && !dormitory.isBlank()) {
      filledCount++;
    }
    if (emergencyContact != null && !emergencyContact.isBlank()) {
      filledCount++;
    }

    if (filledCount == 0) {
      return InfoCompleteness.SEVERE_MISSING;
    } else if (filledCount <= 2) {
      return InfoCompleteness.PARTIAL_MISSING;
    } else {
      return InfoCompleteness.COMPLETE;
    }
  }
}
