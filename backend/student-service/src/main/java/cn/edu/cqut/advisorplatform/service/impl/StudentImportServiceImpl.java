package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ImportBatchDao;
import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.dao.StudentSnapshotDao;
import cn.edu.cqut.advisorplatform.dto.response.ImportBatchResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse;
import cn.edu.cqut.advisorplatform.entity.ImportBatch;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.entity.StudentSnapshot;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import cn.edu.cqut.advisorplatform.service.StudentImportService;
import cn.edu.cqut.advisorplatform.service.StudentService;
import cn.edu.cqut.advisorplatform.service.StudentTaskService;
import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.read.listener.ReadListener;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudentImportServiceImpl implements StudentImportService {

  private static final Logger log = LoggerFactory.getLogger(StudentImportServiceImpl.class);

  private final StudentProfileDao studentProfileDao;
  private final ImportBatchDao importBatchDao;
  private final StudentSnapshotDao snapshotDao;
  private final StudentService studentService;
  private final StudentTaskService taskService;
  private final ObjectMapper objectMapper;

  private final List<String> duplicateStudentNos = new ArrayList<>();

  public StudentImportServiceImpl(
      StudentProfileDao studentProfileDao,
      ImportBatchDao importBatchDao,
      StudentSnapshotDao snapshotDao,
      StudentService studentService,
      StudentTaskService taskService,
      ObjectMapper objectMapper) {
    this.studentProfileDao = studentProfileDao;
    this.importBatchDao = importBatchDao;
    this.snapshotDao = snapshotDao;
    this.studentService = studentService;
    this.taskService = taskService;
    this.objectMapper = objectMapper;
  }

  @Override
  @Transactional
  public ImportResultResponse importStudents(
      MultipartFile file, String operator, boolean overwrite) {
    duplicateStudentNos.clear();

    String batchNo = generateBatchNo();
    String fileName = file.getOriginalFilename();

    ImportBatch batch = new ImportBatch();
    batch.setBatchNo(batchNo);
    batch.setFileName(fileName);
    batch.setStatus(0);
    batch.setCreatedBy(operator);
    batch.setCreatedAt(LocalDateTime.now());
    batch.setUpdatedAt(LocalDateTime.now());
    importBatchDao.save(batch);

    ImportDataHolder holder = new ImportDataHolder();

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
        processRow(data, operator, batchNo, overwrite);
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

  private void processRow(
      StudentImportData data, String operator, String batchNo, boolean overwrite) {
    if (data.studentNo == null || data.studentNo.isBlank()) {
      throw new BusinessException("学号不能为空");
    }

    var existingOpt = studentProfileDao.findByStudentNo(data.studentNo);

    if (existingOpt.isPresent()) {
      StudentProfile existing = existingOpt.get();
      if (overwrite) {
        updateProfile(existing, data, operator, batchNo);
      } else {
        duplicateStudentNos.add(data.studentNo);
        return;
      }
    } else {
      createProfile(data, operator, batchNo);
    }
  }

  private void createProfile(StudentImportData data, String operator, String batchNo) {
    StudentProfile profile = new StudentProfile();
    profile.setStudentNo(data.studentNo);
    profile.setName(data.name);
    profile.setGender(data.gender);
    profile.setGrade(data.grade);
    profile.setMajor(data.major);
    profile.setClassCode(data.classCode);
    profile.setCounselorNo(data.counselorNo);
    profile.setPhone(data.phone);
    profile.setEmail(data.email);
    profile.setDormitory(data.dormitory);
    profile.setEmergencyContact(data.emergencyContact);
    profile.setCreatedBy(operator);
    profile.setCreatedAt(LocalDateTime.now());
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());
    profile.setDeleted(0);

    studentService.calculateAndUpdateInfoCompleteness(profile);
    StudentProfile saved = studentProfileDao.save(profile);

    createSnapshot(saved, batchNo, "BATCH");

    if (saved.isInfoMissing()) {
      taskService.createInfoMissingTaskIfNeeded(saved.getId(), operator);
    }
  }

  private void updateProfile(
      StudentProfile profile, StudentImportData data, String operator, String batchNo) {
    profile.setName(data.name);
    profile.setGender(data.gender);
    profile.setGrade(data.grade);
    profile.setMajor(data.major);
    profile.setClassCode(data.classCode);
    profile.setCounselorNo(data.counselorNo);
    profile.setPhone(data.phone);
    profile.setEmail(data.email);
    profile.setDormitory(data.dormitory);
    profile.setEmergencyContact(data.emergencyContact);
    profile.setUpdatedBy(operator);
    profile.setUpdatedAt(LocalDateTime.now());

    studentService.calculateAndUpdateInfoCompleteness(profile);
    StudentProfile saved = studentProfileDao.save(profile);

    createSnapshot(saved, batchNo, "BATCH");

    if (saved.isInfoMissing()) {
      taskService.createInfoMissingTaskIfNeeded(saved.getId(), operator);
    }
  }

  private void createSnapshot(StudentProfile profile, String batchNo, String snapshotType) {
    try {
      StudentSnapshot snapshot = new StudentSnapshot();
      snapshot.setStudent(profile);
      snapshot.setStudentNo(profile.getStudentNo());
      snapshot.setSemester(batchNo);
      snapshot.setSnapshotType(snapshotType);
      snapshot.setSnapshotData(toJson(profile));
      snapshot.setCreatedAt(LocalDateTime.now());
      snapshotDao.save(snapshot);
    } catch (Exception e) {
      log.warn("创建快照失败: {}", e.getMessage());
    }
  }

  @Override
  public List<String> getDuplicateStudentNos() {
    return new ArrayList<>(duplicateStudentNos);
  }

  @Override
  public Page<ImportBatchResponse> listBatches(Pageable pageable) {
    Page<ImportBatch> page = importBatchDao.findAllByOrderByCreatedAtDesc(pageable);
    return page.map(batch -> ImportBatchResponse.fromEntity(batch, objectMapper));
  }

  private String generateBatchNo() {
    return "IMP-"
        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
        + "-"
        + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
  }

  private String toJson(Object obj) {
    try {
      return objectMapper.writeValueAsString(obj);
    } catch (Exception e) {
      return "{}";
    }
  }

  static class ImportDataHolder {
    List<StudentImportData> dataList = new ArrayList<>();
  }

  static class StudentImportData {
    String studentNo;
    String name;
    Integer gender;
    String grade;
    String major;
    String classCode;
    String counselorNo;
    String phone;
    String email;
    String dormitory;
    String emergencyContact;
    int rowNum;
  }

  static class StudentImportListener implements ReadListener<StudentImportData> {

    private final ImportDataHolder holder;

    StudentImportListener(ImportDataHolder holder) {
      this.holder = holder;
    }

    @Override
    public void invoke(StudentImportData data, AnalysisContext context) {
      data.rowNum = context.readRowHolder().getRowIndex() + 2;
      if (data.studentNo != null && !data.studentNo.isBlank()) {
        holder.dataList.add(data);
      }
    }

    @Override
    public void doAfterAllAnalysed(AnalysisContext context) {}
  }
}
