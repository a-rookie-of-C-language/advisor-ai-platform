package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskFacade {

  private final RiskEngine riskEngine;

  public RiskCheckResponse check(RiskCheckRequest request) {
    if (request.getDirection() == null) {
      request.setDirection(RiskDirection.INPUT);
    }

    log.info(
        "Risk facade check: userId={}, direction={}, path={}",
        request.getUserId(),
        request.getDirection(),
        request.getRequestPath());

    return riskEngine.check(request);
  }
}
