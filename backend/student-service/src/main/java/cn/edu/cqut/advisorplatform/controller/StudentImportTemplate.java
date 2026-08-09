package cn.edu.cqut.advisorplatform.controller;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class StudentImportTemplate {

  @ExcelProperty("学号")
  private String studentNo;

  @ExcelProperty("姓名")
  private String name;

  @ExcelProperty("性别(1男2女)")
  private Integer gender;

  @ExcelProperty("年级")
  private String grade;

  @ExcelProperty("专业")
  private String major;

  @ExcelProperty("班级")
  private String classCode;

  @ExcelProperty("辅导员工号")
  private String counselorNo;

  @ExcelProperty("手机号")
  private String phone;

  @ExcelProperty("邮箱")
  private String email;

  @ExcelProperty("宿舍")
  private String dormitory;

  @ExcelProperty("紧急联系人")
  private String emergencyContact;
}
