package cn.edu.cqut.advisorplatform.client;

import cn.edu.cqut.advisorplatform.config.feign.InternalTokenFeignConfig;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInSummaryResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "check-in-service", configuration = InternalTokenFeignConfig.class)
public interface CheckInServiceClient {

  @GetMapping("/internal/check-in/summary")
  List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(
      @RequestParam("studentIds") List<Long> studentIds);

  @GetMapping("/internal/check-in/{studentId}")
  StudentCheckInDetailResponse getStudentCheckInDetail(
      @PathVariable("studentId") Long studentId, @RequestParam("limit") Integer limit);
}
