package cn.edu.cqut.advisorplatform.dto.request;

public class StudentQueryRequest {

  private String classCode;
  private String counselorNo;
  private String grade;
  private Integer infoCompleteness;
  private Integer riskLevel;
  private String keyword;
  private Integer page = 0;
  private Integer size = 20;

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

  public String getGrade() {
    return grade;
  }

  public void setGrade(String grade) {
    this.grade = grade;
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

  public String getKeyword() {
    return keyword;
  }

  public void setKeyword(String keyword) {
    this.keyword = keyword;
  }

  public Integer getPage() {
    return page;
  }

  public void setPage(Integer page) {
    this.page = page;
  }

  public Integer getSize() {
    return size;
  }

  public void setSize(Integer size) {
    this.size = size;
  }
}
