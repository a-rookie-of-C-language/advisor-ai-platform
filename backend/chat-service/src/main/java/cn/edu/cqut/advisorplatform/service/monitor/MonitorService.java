package cn.edu.cqut.advisorplatform.service.monitor;

import cn.edu.cqut.advisorplatform.dto.response.monitor.MonitorRealtimeResponseDTO;

public interface MonitorService {
  MonitorRealtimeResponseDTO getRealtimeMetrics(int minutes, int stepSeconds);
}
