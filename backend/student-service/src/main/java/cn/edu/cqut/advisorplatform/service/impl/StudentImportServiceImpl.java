package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.response.ImportBatchResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse;
import cn.edu.cqut.advisorplatform.service.StudentImportService;
import cn.edu.cqut.advisorplatform.service.impl.student.StudentImportSupport;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudentImportServiceImpl implements StudentImportService {

  private final StudentImportSupport studentImportSupport;

  public StudentImportServiceImpl(StudentImportSupport studentImportSupport) {
    this.studentImportSupport = studentImportSupport;
  }

  @Override
  @Transactional
  public ImportResultResponse importStudents(
      MultipartFile file, String operator, boolean overwrite) {
    return studentImportSupport.importStudents(file, operator, overwrite);
  }

  @Override
  public List<String> getDuplicateStudentNos() {
    return studentImportSupport.getDuplicateStudentNos();
  }

  @Override
  public Page<ImportBatchResponse> listBatches(Pageable pageable) {
    return studentImportSupport.listBatches(pageable);
  }
}
