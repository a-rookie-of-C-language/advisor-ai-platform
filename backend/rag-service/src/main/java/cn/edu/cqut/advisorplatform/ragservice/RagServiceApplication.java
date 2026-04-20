package cn.edu.cqut.advisorplatform.ragservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
<<<<<<< HEAD
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
=======
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform")
@EnableDiscoveryClient
@EnableFeignClients
<<<<<<< HEAD
@EnableJpaRepositories(basePackages = "cn.edu.cqut.advisorplatform.dao")
@EntityScan(basePackages = "cn.edu.cqut.advisorplatform.entity")
public class RagServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(RagServiceApplication.class, args);
  }
=======
public class RagServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RagServiceApplication.class, args);
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
