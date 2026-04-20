package cn.edu.cqut.advisorplatform.ragservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform")
@EnableDiscoveryClient
@EnableFeignClients
public class RagServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(RagServiceApplication.class, args);
  }
}
