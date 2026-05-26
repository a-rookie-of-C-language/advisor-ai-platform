package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse;
import cn.edu.cqut.advisorplatform.entity.ImportBatch;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

class StudentImportBatchFactory {

  ImportBatch createPendingBatch(String fileName, String operator) {
    ImportBatch batch = new ImportBatch();
    batch.setBatchNo(generateBatchNo());
    batch.setFileName(fileName);
    batch.setStatus(0);
    batch.setCreatedBy(operator);
    batch.setCreatedAt(LocalDateTime.now());
    batch.setUpdatedAt(LocalDateTime.now());
    return batch;
  }

  ImportResultResponse createResultResponse(
      String batchNo,
      int totalCount,
      int successCount,
      int failCount,
      int duplicateCount,
      boolean overwrite,
      List<Map<String, String>> failDetails,
      List<String> duplicateStudentNos) {
    ImportResultResponse response = new ImportResultResponse();
    response.setBatchNo(batchNo);
    response.setTotalCount(totalCount);
    response.setSuccessCount(successCount);
    response.setFailCount(failCount);
    response.setDuplicateCount(duplicateCount);
    response.setSkipCount(overwrite ? 0 : duplicateCount);
    response.setFailDetails(failDetails);
    response.setDuplicateStudentNos(new ArrayList<>(duplicateStudentNos));
    return response;
  }

  private String generateBatchNo() {
    return "IMP-"
        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
        + "-"
        + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
  }
}
