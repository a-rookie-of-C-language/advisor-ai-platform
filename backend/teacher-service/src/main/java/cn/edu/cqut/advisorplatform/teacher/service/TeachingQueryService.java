package cn.edu.cqut.advisorplatform.teacher.service;

import cn.edu.cqut.advisorplatform.teacher.dto.response.CourseTeachingClassResponse;

public interface TeachingQueryService {
  CourseTeachingClassResponse getTeachingClasses(String teacherNo, Long courseId);

  boolean canTeachClass(String teacherNo, Long courseId, String classCode);
}
