package cn.edu.cqut.advisorplatform.dto.response;

import java.util.List;
import java.util.Map;

public class ImportResultResponse {

  private String batchNo;
  private Integer totalCount;
  private Integer successCount;
  private Integer failCount;
  private Integer duplicateCount;
  private Integer skipCount;
  private List<Map<String, String>> failDetails;
  private List<String> duplicateStudentNos;

  public String getBatchNo() {
    return batchNo;
  }

  public void setBatchNo(String batchNo) {
    this.batchNo = batchNo;
  }

  public Integer getTotalCount() {
    return totalCount;
  }

  public void setTotalCount(Integer totalCount) {
    this.totalCount = totalCount;
  }

  public Integer getSuccessCount() {
    return successCount;
  }

  public void setSuccessCount(Integer successCount) {
    this.successCount = successCount;
  }

  public Integer getFailCount() {
    return failCount;
  }

  public void setFailCount(Integer failCount) {
    this.failCount = failCount;
  }

  public Integer getDuplicateCount() {
    return duplicateCount;
  }

  public void setDuplicateCount(Integer duplicateCount) {
    this.duplicateCount = duplicateCount;
  }

  public Integer getSkipCount() {
    return skipCount;
  }

  public void setSkipCount(Integer skipCount) {
    this.skipCount = skipCount;
  }

  public List<Map<String, String>> getFailDetails() {
    return failDetails;
  }

  public void setFailDetails(List<Map<String, String>> failDetails) {
    this.failDetails = failDetails;
  }

  public List<String> getDuplicateStudentNos() {
    return duplicateStudentNos;
  }

  public void setDuplicateStudentNos(List<String> duplicateStudentNos) {
    this.duplicateStudentNos = duplicateStudentNos;
  }
}
