package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.dao.ImportBatchDao;
import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.dao.StudentSnapshotDao;
import cn.edu.cqut.advisorplatform.dto.response.ImportBatchResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse;
import cn.edu.cqut.advisorplatform.entity.ImportBatch;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import cn.edu.cqut.advisorplatform.service.StudentService;
import cn.edu.cqut.advisorplatform.service.StudentTaskService;
import com.alibaba.excel.EasyExcel;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Component
public class StudentImportSupport {

  private static final Logger log = LoggerFactory.getLogger(StudentImportSupport.class);

  private final ImportBatchDao importBatchDao;
  private final ObjectMapper objectMapper;
  private final StudentProfileImportMapper profileMapper = new StudentProfileImportMapper();
  private final StudentImportBatchFactory batchFactory = new StudentImportBatchFactory();
  private final StudentImportRowProcessor rowProcessor;
  private final AtomicReference<List<String>> latestDuplicateStudentNos =
      new AtomicReference<>(List.of());

  public StudentImportSupport(
      StudentProfileDao studentProfileDao,
      ImportBatchDao importBatchDao,
      StudentSnapshotDao snapshotDao,
      StudentService studentService,
      StudentTaskService taskService,
      ObjectMapper objectMapper) {
    this.importBatchDao = importBatchDao;
    this.objectMapper = objectMapper;
    StudentImportSnapshotSupport snapshotSupport =
        new StudentImportSnapshotSupport(snapshotDao, objectMapper);
    this.rowProcessor =
        new StudentImportRowProcessor(
            studentProfileDao, studentService, taskService, profileMapper, snapshotSupport);
  }

  @Transactional
  public ImportResultResponse importStudents(
      MultipartFile file, String operator, boolean overwrite) {
    List<String> duplicateStudentNos = new ArrayList<>();

    ImportBatch batch = batchFactory.createPendingBatch(file.getOriginalFilename(), operator);
    String batchNo = batch.getBatchNo();
    importBatchDao.save(batch);

    StudentImportDataHolder holder = new StudentImportDataHolder();

    try {
      EasyExcel.read(file.getInputStream(), new StudentImportListener(holder)).sheet().doRead();
    } catch (Exception e) {
      log.error("Excel解析失败", e);
      batch.setStatus(2);
      batch.setFailReason("Excel解析失败: " + e.getMessage());
      importBatchDao.save(batch);
      throw new BusinessException("Excel解析失败: " + e.getMessage());
    }

    int totalCount = holder.dataList.size();
    int successCount = 0;
    int failCount = 0;
    List<Map<String, String>> failDetails = new ArrayList<>();

    for (StudentImportData data : holder.dataList) {
      try {
        rowProcessor.processRow(data, operator, batchNo, overwrite, duplicateStudentNos);
        successCount++;
      } catch (Exception e) {
        failCount++;
        Map<String, String> failDetail = new HashMap<>();
        failDetail.put("row", String.valueOf(data.rowNum));
        failDetail.put("studentNo", data.studentNo);
        failDetail.put("reason", e.getMessage());
        failDetails.add(failDetail);
      }
    }

    int duplicateCount = duplicateStudentNos.size();

    batch.setTotalCount(totalCount);
    batch.setSuccessCount(successCount);
    batch.setFailCount(failCount);
    batch.setDuplicateCount(duplicateCount);
    batch.setStatus(1);
    batch.setFailDetails(toJson(failDetails));
    batch.setUpdatedAt(LocalDateTime.now());
    importBatchDao.save(batch);
    latestDuplicateStudentNos.set(List.copyOf(duplicateStudentNos));

    return batchFactory.createResultResponse(
        batchNo,
        totalCount,
        successCount,
        failCount,
        duplicateCount,
        overwrite,
        failDetails,
        duplicateStudentNos);
  }

  public List<String> getDuplicateStudentNos() {
    return new ArrayList<>(latestDuplicateStudentNos.get());
  }

  public Page<ImportBatchResponse> listBatches(Pageable pageable) {
    Page<ImportBatch> page = importBatchDao.findAllByOrderByCreatedAtDesc(pageable);
    return page.map(batch -> ImportBatchResponse.fromEntity(batch, objectMapper));
  }

  private String toJson(Object obj) {
    try {
      return objectMapper.writeValueAsString(obj);
    } catch (Exception e) {
      return "{}";
    }
  }
}
