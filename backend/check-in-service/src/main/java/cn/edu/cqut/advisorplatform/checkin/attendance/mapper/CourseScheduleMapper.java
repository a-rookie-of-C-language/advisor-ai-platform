package cn.edu.cqut.advisorplatform.checkin.attendance.mapper;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.CourseSchedule;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CourseScheduleMapper {
  int insert(CourseSchedule schedule);
}
