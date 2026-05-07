package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "import_batch",
    indexes = {
      @Index(name = "idx_batch_created_by", columnList = "created_by"),
      @Index(name = "idx_batch_created_at", columnList = "created_at"),
      @Index(name = "idx_batch_status", columnList = "status")
    })
public class ImportBatch {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "batch_no", nullable = false, unique = true, length = 64)
  private String batchNo;

  @Column(name = "file_name", length = 256)
  private String fileName;

  @Column(name = "total_count")
  private Integer totalCount;

  @Column(name = "success_count")
  private Integer successCount;

  @Column(name = "fail_count")
  private Integer failCount;

  @Column(name = "duplicate_count")
  private Integer duplicateCount;

  @Column(name = "status")
  private Integer status = 0;

  @Column(name = "fail_reason", columnDefinition = "TEXT")
  private String failReason;

  @Column(name = "fail_details", columnDefinition = "jsonb")
  private String failDetails;

  @Column(name = "created_by", length = 64)
  private String createdBy;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

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

  public Integer getStatus() {
    return status;
  }

  public void setStatus(Integer status) {
    this.status = status;
  }

  public String getFailReason() {
    return failReason;
  }

  public void setFailReason(String failReason) {
    this.failReason = failReason;
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
