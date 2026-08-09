package cn.edu.cqut.advisorplatform.checkin.attendance.dao;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.CourseSchedule;
import cn.edu.cqut.advisorplatform.checkin.attendance.mapper.CourseScheduleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CourseScheduleDao {
  private final CourseScheduleMapper mapper;

  public int insert(CourseSchedule schedule) {
    return mapper.insert(schedule);
  }
}
