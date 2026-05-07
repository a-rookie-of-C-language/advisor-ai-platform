package cn.edu.cqut.advisorplatform.checkin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication(scanBasePackages = "cn.edu.cqut.advisorplatform" )
@EnableDiscoveryClient
@MapperScan("cn.edu.cqut.advisorplatform.checkin.mapper")
public class CheckInServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CheckInServiceApplication.class,args);
    }
}
