package cn.edu.cqut.advisorplatform.config.feign;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalTokenFeignConfig {

  @Bean
  public RequestInterceptor internalTokenRequestInterceptor(
      @Value("${advisor.internal.token:}") String internalToken) {
    return template -> {
      if (internalToken != null && !internalToken.isBlank()) {
        template.header("X-Internal-Token", internalToken);
      }
    };
  }
}
