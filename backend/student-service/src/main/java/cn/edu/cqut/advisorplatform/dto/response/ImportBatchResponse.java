package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.ImportBatch;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.format.DateTimeFormatter;
import org.springframework.data.domain.Page;

public class ImportBatchResponse {

  private Long id;
  private String batchNo;
  private String fileName;
  private Integer status;
  private String statusText;
  private Integer totalCount;
  private Integer successCount;
  private Integer failCount;
  private Integer duplicateCount;
  private String failDetails;
  private String createdBy;
  private String createdAt;

  public static ImportBatchResponse fromEntity(ImportBatch batch, ObjectMapper objectMapper) {
    ImportBatchResponse response = new ImportBatchResponse();
    response.setId(batch.getId());
    response.setBatchNo(batch.getBatchNo());
    response.setFileName(batch.getFileName());
    response.setStatus(batch.getStatus());
    response.setStatusText(getStatusText(batch.getStatus()));
    response.setTotalCount(batch.getTotalCount());
    response.setSuccessCount(batch.getSuccessCount());
    response.setFailCount(batch.getFailCount());
    response.setDuplicateCount(batch.getDuplicateCount());
    response.setFailDetails(batch.getFailDetails());
    response.setCreatedBy(batch.getCreatedBy());
    response.setCreatedAt(
        batch.getCreatedAt() != null
            ? batch.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
            : null);
    return response;
  }

  private static String getStatusText(Integer status) {
    if (status == null) return "未知";
    return switch (status) {
      case 0 -> "处理中";
      case 1 -> "已完成";
      case 2 -> "失败";
      default -> "未知";
    };
  }

  public static Page<ImportBatchResponse> fromPage(
      Page<ImportBatch> page, ObjectMapper objectMapper) {
    return page.map(batch -> fromEntity(batch, objectMapper));
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getBatchNo() {
    return batchNo;
  }

  public void setBatchNo(String batchNo) {
    this.batchNo = batchNo;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public Integer getStatus() {
    return status;
  }

  public void setStatus(Integer status) {
    this.status = status;
  }

  public String getStatusText() {
    return statusText;
  }

  public void setStatusText(String statusText) {
    this.statusText = statusText;
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

  public String getFailDetails() {
    return failDetails;
  }

  public void setFailDetails(String failDetails) {
    this.failDetails = failDetails;
  }

  public String getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(String createdBy) {
    this.createdBy = createdBy;
  }

  public String getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(String createdAt) {
    this.createdAt = createdAt;
  }
}
