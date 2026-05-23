package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.StatOverviewResponse;

public interface StudentStatService {

  StatOverviewResponse getOverview();

  long countMissingInfo();
}
