package cn.edu.cqut.advisorplatform.checkin.client;

import cn.edu.cqut.advisorplatform.checkin.client.dto.UserIdentityResponse;
import cn.edu.cqut.advisorplatform.checkin.config.feign.InternalTokenFeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "auth-service", configuration = InternalTokenFeignConfig.class)
public interface AuthServiceClient {
  @GetMapping("/internal/identity/user/{userId}")
  UserIdentityResponse getIdentity(
      @PathVariable("userId") Long userId, @RequestParam("type") String identityType);
}
