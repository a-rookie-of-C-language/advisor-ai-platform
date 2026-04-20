package cn.edu.cqut.advisorplatform.common.web;

<<<<<<< HEAD
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  @GetMapping("/internal/health")
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }
=======
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/internal/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
