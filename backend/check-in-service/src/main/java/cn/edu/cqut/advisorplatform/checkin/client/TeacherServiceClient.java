package cn.edu.cqut.advisorplatform.checkin.client;

import cn.edu.cqut.advisorplatform.checkin.client.dto.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.checkin.config.feign.InternalTokenFeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "teacher-service", configuration = InternalTokenFeignConfig.class)
public interface TeacherServiceClient {
  @GetMapping("/internal/teaching/teacher/{teacherNo}/course/{courseId}/classes")
  CourseTeachingClassResponse getTeachingClasses(
      @PathVariable("teacherNo") String teacherNo, @PathVariable("courseId") Long courseId);
}
