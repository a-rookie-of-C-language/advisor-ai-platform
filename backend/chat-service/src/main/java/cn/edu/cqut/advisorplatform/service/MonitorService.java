package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.MonitorRealtimeResponseDTO;

public interface MonitorService {
  MonitorRealtimeResponseDTO getRealtimeMetrics(int minutes, int stepSeconds);
}
