package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.TrackingEventMessage;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserViolation;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserViolationRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskEngine {

    private final List<RiskFilter> filters;
    private final UserViolationRepository userViolationRepository;

    public RiskCheckResponse check(RiskCheckRequest request) {
        for (RiskFilter filter : filters) {
            RiskCheckResponse response = filter.check(request);
            if (!response.isPassed()) {
                log.info("Risk check failed: filter={}, userId={}, category={}, reason={}",
                        filter.getName(), request.getUserId(), response.getCategory(), response.getReason());

                // 记录违规
                if (request.getUserId() != null) {
                    recordViolation(request, response);
                }

                return response;
            }
        }
        return RiskCheckResponse.builder().passed(true).build();
    }

    public void processEvent(TrackingEventMessage message) {
        RiskCheckRequest request = RiskCheckRequest.builder()
                .userId(message.getUserId())
                .sessionId(message.getSessionId())
                .ipAddress(message.getIpAddress())
                .eventType(message.getEventType())
                .content(message.getExtraData())
                .build();
        check(request);
    }

    private void recordViolation(RiskCheckRequest request, RiskCheckResponse response) {
        try {
            UserViolation violation = UserViolation.builder()
                    .userId(request.getUserId())
                    .violationType(response.getCategory())
                    .requestPath(request.getRequestPath())
                    .requestBody(request.getRequestBody())
                    .ipAddress(request.getIpAddress())
                    .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                    .build();
            userViolationRepository.save(violation);
        } catch (Exception e) {
            log.error("Failed to record violation: userId={}", request.getUserId(), e);
        }
    }
}
