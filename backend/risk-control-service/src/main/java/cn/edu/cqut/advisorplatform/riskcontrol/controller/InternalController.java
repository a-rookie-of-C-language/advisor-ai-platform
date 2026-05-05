package cn.edu.cqut.advisorplatform.riskcontrol.controller;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.service.RiskEngine;
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

    private final RiskEngine riskEngine;

    @PostMapping("/check")
    public ResponseEntity<RiskCheckResponse> checkRisk(@RequestBody RiskCheckRequest request) {
        log.info("Internal risk check request: userId={}, requestPath={}",
                request.getUserId(), request.getRequestPath());

        RiskCheckResponse response = riskEngine.check(request);
        return ResponseEntity.ok(response);
    }
}
