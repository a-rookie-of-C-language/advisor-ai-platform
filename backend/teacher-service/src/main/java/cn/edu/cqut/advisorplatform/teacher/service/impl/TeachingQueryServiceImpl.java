package cn.edu.cqut.advisorplatform.teacher.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.teacher.dao.CourseDao;
import cn.edu.cqut.advisorplatform.teacher.dao.TeachingAssignmentDao;
import cn.edu.cqut.advisorplatform.teacher.dto.response.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.teacher.entity.Course;
import cn.edu.cqut.advisorplatform.teacher.service.TeachingQueryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeachingQueryServiceImpl implements TeachingQueryService {
  private static final String ACTIVE = "ACTIVE";

  private final CourseDao courseDao;
  private final TeachingAssignmentDao teachingAssignmentDao;

  @Override
  public CourseTeachingClassResponse getTeachingClasses(String teacherNo, Long courseId) {
    Course course =
        courseDao
            .findByIdAndDeleted(courseId, 0)
            .orElseThrow(() -> new BadRequestException("课程不存在"));
    List<String> classCodes =
        teachingAssignmentDao
            .findByTeacherNoAndCourseIdAndStatusAndDeleted(teacherNo, courseId, ACTIVE, 0)
            .stream()
            .map(assignment -> assignment.getClassCode())
            .distinct()
            .toList();
    CourseTeachingClassResponse response = new CourseTeachingClassResponse();
    response.setCourseId(courseId);
    response.setCourseName(course.getCourseName());
    response.setSemester(course.getSemester());
    response.setClassCodes(classCodes);
    return response;
  }

  @Override
  public boolean canTeachClass(String teacherNo, Long courseId, String classCode) {
    return teachingAssignmentDao.existsByTeacherNoAndCourseIdAndClassCodeAndStatusAndDeleted(
        teacherNo, courseId, classCode, ACTIVE, 0);
  }
}
