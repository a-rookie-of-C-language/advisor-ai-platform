package cn.edu.cqut.advisorplatform.common.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Feign 内部服务调用配置
 *
 * <p>自动添加 X-Internal-Token 请求头，用于微服务间鉴权
 */
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
