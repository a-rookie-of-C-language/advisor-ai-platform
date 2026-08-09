package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.dao.StudentSnapshotDao;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.entity.StudentSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class StudentImportSnapshotSupport {

  private static final Logger log = LoggerFactory.getLogger(StudentImportSnapshotSupport.class);

  private final StudentSnapshotDao snapshotDao;
  private final ObjectMapper objectMapper;

  StudentImportSnapshotSupport(StudentSnapshotDao snapshotDao, ObjectMapper objectMapper) {
    this.snapshotDao = snapshotDao;
    this.objectMapper = objectMapper;
  }

  void createSnapshot(StudentProfile profile, String batchNo, String snapshotType) {
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

  private String toJson(Object obj) {
    try {
      return objectMapper.writeValueAsString(obj);
    } catch (Exception e) {
      return "{}";
    }
  }
}
