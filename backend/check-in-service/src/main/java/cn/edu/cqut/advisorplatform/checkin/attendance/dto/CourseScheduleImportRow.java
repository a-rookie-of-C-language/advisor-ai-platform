package cn.edu.cqut.advisorplatform.checkin.attendance.dto;

import com.alibaba.excel.annotation.ExcelProperty;
import lombok.Data;

@Data
public class CourseScheduleImportRow {
  @ExcelProperty("学期")
  private String term;

  @ExcelProperty("班级")
  private String classCode;

  @ExcelProperty("课程编号")
  private String courseCode;

  @ExcelProperty("课程名称")
  private String courseName;

  @ExcelProperty("教师工号")
  private String teacherNo;

  @ExcelProperty("教师姓名")
  private String teacherName;

  @ExcelProperty("周次范围")
  private String weekRange;

  @ExcelProperty("星期")
  private Integer weekday;

  @ExcelProperty("节次")
  private String periodRange;

  @ExcelProperty("地点")
  private String location;
}
