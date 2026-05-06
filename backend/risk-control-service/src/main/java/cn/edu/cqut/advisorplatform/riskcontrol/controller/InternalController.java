package cn.edu.cqut.advisorplatform.riskcontrol.controller;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.service.RiskFacade;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/internal/risk")
@RequiredArgsConstructor
public class InternalController {

  private final RiskFacade riskFacade;

  @PostMapping("/check")
  public ResponseEntity<RiskCheckResponse> checkRisk(@Valid @RequestBody RiskCheckRequest request) {
    log.info(
        "Internal risk check request: userId={}, direction={}, requestPath={}",
        request.getUserId(),
        request.getDirection(),
        request.getRequestPath());

    RiskCheckResponse response = riskFacade.check(request);
    return ResponseEntity.ok(response);
  }
}
