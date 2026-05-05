package cn.edu.cqut.advisorplatform.riskcontrol;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform")
@EnableDiscoveryClient
@EnableFeignClients
@EnableAsync
@EnableKafka
@EnableJpaRepositories(basePackages = "cn.edu.cqut.advisorplatform.riskcontrol.repository")
@EntityScan(basePackages = "cn.edu.cqut.advisorplatform.riskcontrol.entity")
public class RiskControlServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(RiskControlServiceApplication.class, args);
  }
}
