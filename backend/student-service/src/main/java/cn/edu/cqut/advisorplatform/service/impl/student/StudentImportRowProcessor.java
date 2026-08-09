package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import cn.edu.cqut.advisorplatform.service.StudentService;
import cn.edu.cqut.advisorplatform.service.StudentTaskService;
import java.time.LocalDateTime;
import java.util.List;

class StudentImportRowProcessor {

  private final StudentProfileDao studentProfileDao;
  private final StudentService studentService;
  private final StudentTaskService taskService;
  private final StudentProfileImportMapper profileMapper;
  private final StudentImportSnapshotSupport snapshotSupport;

  StudentImportRowProcessor(
      StudentProfileDao studentProfileDao,
      StudentService studentService,
      StudentTaskService taskService,
      StudentProfileImportMapper profileMapper,
      StudentImportSnapshotSupport snapshotSupport) {
    this.studentProfileDao = studentProfileDao;
    this.studentService = studentService;
    this.taskService = taskService;
    this.profileMapper = profileMapper;
    this.snapshotSupport = snapshotSupport;
  }

  void processRow(
      StudentImportData data,
      String operator,
      String batchNo,
      boolean overwrite,
      List<String> duplicateStudentNos) {
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
      }
    } else {
      createProfile(data, operator, batchNo);
    }
  }

  private void createProfile(StudentImportData data, String operator, String batchNo) {
    StudentProfile profile = profileMapper.create(data, operator, LocalDateTime.now());

    studentService.calculateAndUpdateInfoCompleteness(profile);
    StudentProfile saved = studentProfileDao.save(profile);

    createSnapshot(saved, batchNo, "BATCH");

    if (saved.isInfoMissing()) {
      taskService.createInfoMissingTaskIfNeeded(saved.getId(), operator);
    }
  }

  private void updateProfile(
      StudentProfile profile, StudentImportData data, String operator, String batchNo) {
    profileMapper.update(profile, data, operator, LocalDateTime.now());

    studentService.calculateAndUpdateInfoCompleteness(profile);
    StudentProfile saved = studentProfileDao.save(profile);

    createSnapshot(saved, batchNo, "BATCH");

    if (saved.isInfoMissing()) {
      taskService.createInfoMissingTaskIfNeeded(saved.getId(), operator);
    }
  }

  private void createSnapshot(StudentProfile profile, String batchNo, String snapshotType) {
    snapshotSupport.createSnapshot(profile, batchNo, snapshotType);
  }
}
