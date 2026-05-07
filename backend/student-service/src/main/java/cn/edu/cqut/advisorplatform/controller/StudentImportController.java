package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.ImportBatchResponse;
import cn.edu.cqut.advisorplatform.service.StudentImportService;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/student/import")
public class StudentImportController {

  private final StudentImportService importService;

  public StudentImportController(StudentImportService importService) {
    this.importService = importService;
  }

  @GetMapping("/template")
  public void downloadTemplate(jakarta.servlet.http.HttpServletResponse response)
      throws java.io.IOException {
    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setCharacterEncoding("utf-8");
    String fileName =
        java.net.URLEncoder.encode("学生信息导入模板", java.nio.charset.StandardCharsets.UTF_8)
            .replaceAll("\\+", "%20");
    response.setHeader("Content-disposition", "attachment;filename=" + fileName + ".xlsx");

    com.alibaba.excel.write.metadata.style.WriteCellStyle headStyle =
        new com.alibaba.excel.write.metadata.style.WriteCellStyle();
    headStyle.setWriteFont(new com.alibaba.excel.write.metadata.style.WriteFont(12, true));
    headStyle.setHorizontalAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

    com.alibaba.excel.write.metadata.style.WriteCellStyle dataStyle =
        new com.alibaba.excel.write.metadata.style.WriteCellStyle();
    dataStyle.setHorizontalAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);

    com.alibaba.excel.write.style.HorizontalCellStyleStrategy styleStrategy =
        new com.alibaba.excel.write.style.HorizontalCellStyleStrategy(headStyle, dataStyle);

    com.alibaba.excel.EasyExcel.write(response.getOutputStream(), StudentImportTemplate.class)
        .registerWriteHandler(styleStrategy)
        .sheet("学生信息")
        .doWrite(getTemplateData());
  }

  private java.util.List<StudentImportTemplate> getTemplateData() {
    java.util.List<StudentImportTemplate> list = new java.util.ArrayList<>();
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
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
    PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<ImportBatchResponse> result = importService.listBatches(pageRequest);
    return ApiResponse.success(result);
  }

  @GetMapping("/duplicates")
  public ApiResponse<List<String>> getDuplicates() {
    return ApiResponse.success(importService.getDuplicateStudentNos());
  }

  @PostMapping("/upload")
  public ApiResponse<cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse> upload(
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "overwrite", defaultValue = "true") boolean overwrite) {
    cn.edu.cqut.advisorplatform.dto.response.ImportResultResponse response =
        importService.importStudents(file, "system", overwrite);
    return ApiResponse.success(response);
  }

  public static class StudentImportTemplate {

    @com.alibaba.excel.annotation.ExcelProperty("学号")
    private String studentNo;

    @com.alibaba.excel.annotation.ExcelProperty("姓名")
    private String name;

    @com.alibaba.excel.annotation.ExcelProperty("性别(1男/2女)")
    private Integer gender;

    @com.alibaba.excel.annotation.ExcelProperty("年级")
    private String grade;

    @com.alibaba.excel.annotation.ExcelProperty("专业")
    private String major;

    @com.alibaba.excel.annotation.ExcelProperty("班级")
    private String classCode;

    @com.alibaba.excel.annotation.ExcelProperty("辅导员工号")
    private String counselorNo;

    @com.alibaba.excel.annotation.ExcelProperty("手机号")
    private String phone;

    @com.alibaba.excel.annotation.ExcelProperty("邮箱")
    private String email;

    @com.alibaba.excel.annotation.ExcelProperty("宿舍")
    private String dormitory;

    @com.alibaba.excel.annotation.ExcelProperty("紧急联系人")
    private String emergencyContact;

    public String getStudentNo() {
      return studentNo;
    }

    public void setStudentNo(String studentNo) {
      this.studentNo = studentNo;
    }

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public Integer getGender() {
      return gender;
    }

    public void setGender(Integer gender) {
      this.gender = gender;
    }

    public String getGrade() {
      return grade;
    }

    public void setGrade(String grade) {
      this.grade = grade;
    }

    public String getMajor() {
      return major;
    }

    public void setMajor(String major) {
      this.major = major;
    }

    public String getClassCode() {
      return classCode;
    }

    public void setClassCode(String classCode) {
      this.classCode = classCode;
    }

    public String getCounselorNo() {
      return counselorNo;
    }

    public void setCounselorNo(String counselorNo) {
      this.counselorNo = counselorNo;
    }

    public String getPhone() {
      return phone;
    }

    public void setPhone(String phone) {
      this.phone = phone;
    }

    public String getEmail() {
      return email;
    }

    public void setEmail(String email) {
      this.email = email;
    }

    public String getDormitory() {
      return dormitory;
    }

    public void setDormitory(String dormitory) {
      this.dormitory = dormitory;
    }

    public String getEmergencyContact() {
      return emergencyContact;
    }

    public void setEmergencyContact(String emergencyContact) {
      this.emergencyContact = emergencyContact;
    }
  }
}
