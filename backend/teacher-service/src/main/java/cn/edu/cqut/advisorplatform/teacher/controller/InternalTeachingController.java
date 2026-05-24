package cn.edu.cqut.advisorplatform.teacher.controller;

import cn.edu.cqut.advisorplatform.teacher.dto.response.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.teacher.service.TeachingQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/teaching")
@RequiredArgsConstructor
public class InternalTeachingController {
  private final TeachingQueryService teachingQueryService;

  @GetMapping("/teacher/{teacherNo}/course/{courseId}/classes")
  public CourseTeachingClassResponse getTeachingClasses(
      @PathVariable("teacherNo") String teacherNo, @PathVariable("courseId") Long courseId) {
    return teachingQueryService.getTeachingClasses(teacherNo, courseId);
  }

  @GetMapping("/teacher/{teacherNo}/course/{courseId}/can-teach")
  public Boolean canTeachClass(
      @PathVariable("teacherNo") String teacherNo,
      @PathVariable("courseId") Long courseId,
      @RequestParam("classCode") String classCode) {
    return teachingQueryService.canTeachClass(teacherNo, courseId, classCode);
  }
}
