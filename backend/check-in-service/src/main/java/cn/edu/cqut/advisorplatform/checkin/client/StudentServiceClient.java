package cn.edu.cqut.advisorplatform.checkin.client;

import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.common.config.InternalTokenFeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "student-service", configuration = InternalTokenFeignConfig.class)
public interface StudentServiceClient {
  @GetMapping("/internal/student/no/{studentNo}/class")
  StudentClassResponse getStudentClass(@PathVariable("studentNo") String studentNo);
}
