package cn.edu.cqut.advisorplatform.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform")
public class GatewayApplication {

<<<<<<< HEAD
  public static void main(String[] args) {
    SpringApplication.run(GatewayApplication.class, args);
  }
=======
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
