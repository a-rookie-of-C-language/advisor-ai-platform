package cn.edu.cqut.advisorplatform.checkin.attendance.service.impl.schedule;

import cn.edu.cqut.advisorplatform.checkin.attendance.dto.CourseScheduleImportRow;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class CourseScheduleImportParser {
  private static final Pattern RANGE_PATTERN = Pattern.compile("(\\d+)\\s*-\\s*(\\d+)");

  int[] parseWeekRange(CourseScheduleImportRow row) {
    return parseRange(row.getWeekRange(), "周次范围");
  }

  int[] parsePeriodRange(CourseScheduleImportRow row) {
    return parseRange(row.getPeriodRange(), "节次");
  }

  void validate(CourseScheduleImportRow row) {
    if (isBlank(row.getTerm())
        || isBlank(row.getClassCode())
        || isBlank(row.getCourseCode())
        || isBlank(row.getCourseName())
        || row.getWeekday() == null) {
      throw new BadRequestException("课表模板存在必填字段为空");
    }
    if (row.getWeekday() < 1 || row.getWeekday() > 7) {
      throw new BadRequestException("星期必须在 1 到 7 之间");
    }
  }

  String trim(String value) {
    return value == null ? null : value.trim();
  }

  private int[] parseRange(String value, String fieldName) {
    if (isBlank(value)) {
      throw new BadRequestException(fieldName + "不能为空");
    }
    Matcher matcher = RANGE_PATTERN.matcher(value.trim());
    if (!matcher.matches()) {
      throw new BadRequestException(fieldName + "格式必须为 起始-结束");
    }
    int start = Integer.parseInt(matcher.group(1));
    int end = Integer.parseInt(matcher.group(2));
    if (start < 1 || end < start) {
      throw new BadRequestException(fieldName + "范围不合法");
    }
    return new int[] {start, end};
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
