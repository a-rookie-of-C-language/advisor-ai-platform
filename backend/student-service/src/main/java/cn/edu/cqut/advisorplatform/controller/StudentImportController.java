package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportBatchResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse;
import cn.edu.cqut.advisorplatform.service.StudentImportService;
import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.write.metadata.style.WriteCellStyle;
import com.alibaba.excel.write.metadata.style.WriteFont;
import com.alibaba.excel.write.style.HorizontalCellStyleStrategy;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/student/import")
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
public class StudentImportController {

  private final StudentImportService importService;

  public StudentImportController(StudentImportService importService) {
    this.importService = importService;
  }

  @GetMapping("/template")
  public void downloadTemplate(HttpServletResponse response) throws IOException {
    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setCharacterEncoding("utf-8");
    String fileName =
        URLEncoder.encode("学生信息导入模板", StandardCharsets.UTF_8).replaceAll("\\+", "%20");
    response.setHeader("Content-disposition", "attachment;filename=" + fileName + ".xlsx");

    WriteCellStyle headStyle = new WriteCellStyle();
    WriteFont headFont = new WriteFont();
    headFont.setFontHeightInPoints((short) 12);
    headFont.setBold(true);
    headStyle.setWriteFont(headFont);
    headStyle.setHorizontalAlignment(HorizontalAlignment.CENTER);

    WriteCellStyle dataStyle = new WriteCellStyle();
    dataStyle.setHorizontalAlignment(HorizontalAlignment.LEFT);

    HorizontalCellStyleStrategy styleStrategy =
        new HorizontalCellStyleStrategy(headStyle, dataStyle);

    EasyExcel.write(response.getOutputStream(), StudentImportTemplate.class)
        .registerWriteHandler(styleStrategy)
        .sheet("学生信息")
        .doWrite(getTemplateData());
  }

  private List<StudentImportTemplate> getTemplateData() {
    List<StudentImportTemplate> list = new ArrayList<>();
    StudentImportTemplate row = new StudentImportTemplate();
    row.setStudentNo("2023001");
    row.setName("张三");
    row.setGender(1);
    row.setGrade("2023");
    row.setMajor("计算机科学与技术");
    row.setClassCode("2023计科1班");
    row.setCounselorNo("T001");
    row.setPhone("13800138000");
    row.setEmail("zhangsan@example.com");
    row.setDormitory("1栋101");
    row.setEmergencyContact("张老师 13900139000");
    list.add(row);
    return list;
  }

  @GetMapping("/batches")
  public ApiResponse<Page<ImportBatchResponse>> listBatches(
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "size", defaultValue = "10") int size) {
    PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<ImportBatchResponse> result = importService.listBatches(pageRequest);
    return ApiResponse.success(result);
  }

  @GetMapping("/duplicates")
  public ApiResponse<List<String>> getDuplicates() {
    return ApiResponse.success(importService.getDuplicateStudentNos());
  }

  @PostMapping("/upload")
  public ApiResponse<ImportResultResponse> upload(
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "overwrite", defaultValue = "true") boolean overwrite) {
    ImportResultResponse response = importService.importStudents(file, "system", overwrite);
    return ApiResponse.success(response);
  }
}
