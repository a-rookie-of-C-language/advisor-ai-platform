package cn.edu.cqut.advisorplatform.config.websocket;

import cn.edu.cqut.advisorplatform.config.security.JwtUtil;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

  private final MonitorService monitorService;
  private final JwtUtil jwtUtil;
  private final ObjectMapper objectMapper;

  public WebSocketConfig(
      MonitorService monitorService, JwtUtil jwtUtil, ObjectMapper objectMapper) {
    this.monitorService = monitorService;
    this.jwtUtil = jwtUtil;
    this.objectMapper = objectMapper;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry.addHandler(monitorWebSocketHandler(), "/ws/monitor").setAllowedOrigins("*");
  }

  @Bean
  public MonitorWebSocketHandler monitorWebSocketHandler() {
    return new MonitorWebSocketHandler(monitorService, jwtUtil, objectMapper);
  }
}
