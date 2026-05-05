package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBehaviorStat;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserBehaviorStatRepository;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserViolationRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserBehaviorFilter implements RiskFilter {

  private final UserBehaviorStatRepository userBehaviorStatRepository;
  private final UserViolationRepository userViolationRepository;

  @Value("${advisor.risk.ban.permanent-threshold:20}")
  private int permanentThreshold;

  @Override
  public String getName() {
    return "user-behavior";
  }

  @Override
  public RiskCheckResponse check(RiskCheckRequest request) {
    if (request.getUserId() == null) {
      return passed();
    }

    // 检查历史违规次数
    long violationCount =
        userViolationRepository.countByUserIdSince(
            request.getUserId(), LocalDateTime.now().minusDays(30));

    if (violationCount >= permanentThreshold) {
      log.warn(
          "User behavior violation threshold exceeded: userId={}, violationCount={}",
          request.getUserId(),
          violationCount);
      return RiskCheckResponse.builder()
          .passed(false)
          .action("ban_permanent")
          .reason("用户行为异常，违规次数过多")
          .category("user_behavior")
          .statusCode(403)
          .message("您的账号因异常行为已被封禁")
          .build();
    }

    // 检查今日行为统计
    Optional<UserBehaviorStat> statOpt =
        userBehaviorStatRepository.findByUserIdAndDate(request.getUserId(), LocalDate.now());

    if (statOpt.isPresent()) {
      UserBehaviorStat stat = statOpt.get();
      if (stat.getSuspiciousPattern() != null && !stat.getSuspiciousPattern().isEmpty()) {
        log.warn(
            "Suspicious behavior pattern detected: userId={}, pattern={}",
            request.getUserId(),
            stat.getSuspiciousPattern());
        return RiskCheckResponse.builder()
            .passed(false)
            .action("warn")
            .reason("检测到可疑行为模式")
            .category("user_behavior")
            .statusCode(200)
            .build();
      }
    }

    return passed();
  }

  private RiskCheckResponse passed() {
    return RiskCheckResponse.builder().passed(true).build();
  }
}
