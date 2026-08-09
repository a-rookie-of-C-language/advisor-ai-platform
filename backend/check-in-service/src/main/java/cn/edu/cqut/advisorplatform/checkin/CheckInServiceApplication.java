package cn.edu.cqut.advisorplatform.checkin;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform")
@EnableDiscoveryClient
@EnableFeignClients
@MapperScan({
  "cn.edu.cqut.advisorplatform.checkin.mapper",
  "cn.edu.cqut.advisorplatform.checkin.attendance.mapper"
})
public class CheckInServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(CheckInServiceApplication.class, args);
  }
}
