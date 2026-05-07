package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.ImportBatchResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface StudentImportService {

  ImportResultResponse importStudents(MultipartFile file, String operator, boolean overwrite);

  List<String> getDuplicateStudentNos();

  Page<ImportBatchResponse> listBatches(Pageable pageable);
}
