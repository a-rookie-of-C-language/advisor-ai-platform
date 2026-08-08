package cn.edu.cqut.advisorplatform.service.impl.monitor;

import cn.edu.cqut.advisorplatform.dto.response.MonitorRealtimeResponseDTO;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MonitorServiceImpl implements MonitorService {

  private final MonitorMetricSupport monitorMetricSupport;

  @Override
  public MonitorRealtimeResponseDTO getRealtimeMetrics(int minutes, int stepSeconds) {
    return monitorMetricSupport.getRealtimeMetrics(minutes, stepSeconds);
  }
}
