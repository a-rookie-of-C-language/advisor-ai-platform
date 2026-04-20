package cn.edu.cqut.advisorplatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableDiscoveryClient
@EnableFeignClients
public class AdvisorAiPlatformApplication {

  public static void main(String[] args) {
    SpringApplication.run(AdvisorAiPlatformApplication.class, args);
  }
}
