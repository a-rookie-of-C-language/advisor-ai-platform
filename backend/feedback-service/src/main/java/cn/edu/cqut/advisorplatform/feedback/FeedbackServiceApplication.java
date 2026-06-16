package cn.edu.cqut.advisorplatform.feedback;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform")
@EnableDiscoveryClient
@ConfigurationPropertiesScan
public class FeedbackServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(FeedbackServiceApplication.class, args);
  }
}
