package cn.edu.cqut.advisorplatform.checkin.record.dto.response;

import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.write.style.ColumnWidth;
import java.time.format.DateTimeFormatter;
import lombok.Data;

/** 签到记录 Excel 导出行模型 */
@Data
public class CheckInExportRow {

  private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
  private static final DateTimeFormatter TIME_FMT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  @ExcelProperty("学号")
  @ColumnWidth(16)
  private String studentNo;

  @ExcelProperty("姓名")
  @ColumnWidth(12)
  private String studentName;

  @ExcelProperty("班级")
  @ColumnWidth(14)
  private String classCode;

  @ExcelProperty("打卡活动")
  @ColumnWidth(24)
  private String activityTitle;

  @ExcelProperty("打卡日期")
  @ColumnWidth(14)
  private String checkDate;

  @ExcelProperty("是否打卡")
  @ColumnWidth(12)
  private String checkedIn;

  @ExcelProperty("打卡时间")
  @ColumnWidth(22)
  private String checkTime;

  public static CheckInExportRow from(
      String studentNo,
      String studentName,
      String classCode,
      String activityTitle,
      java.time.LocalDate checkDate,
      Boolean checkedIn,
      java.time.LocalDateTime checkTime) {
    CheckInExportRow row = new CheckInExportRow();
    row.studentNo = studentNo;
    row.studentName = studentName;
    row.classCode = classCode;
    row.activityTitle = activityTitle;
    row.checkDate = checkDate != null ? checkDate.format(DATE_FMT) : "";
    row.checkedIn = Boolean.TRUE.equals(checkedIn) ? "是" : "否";
    row.checkTime = checkTime != null ? checkTime.format(TIME_FMT) : "";
    return row;
  }
}
