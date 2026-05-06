package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserBanRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Order(10)
@RequiredArgsConstructor
public class BlacklistFilter implements RiskFilter {

  private final UserBanRepository userBanRepository;

  @Override
  public String getName() {
    return "blacklist";
  }

  @Override
  public RiskCheckResponse check(RiskCheckRequest request) {
    if (request.getUserId() == null) {
      return passed();
    }

    return userBanRepository
        .findActiveBanByUserId(request.getUserId(), LocalDateTime.now())
        .map(
            ban -> {
              log.warn(
                  "User is banned: userId={}, banType={}, reason={}",
                  request.getUserId(),
                  ban.getBanType(),
                  ban.getReason());
              String message = "permanent".equals(ban.getBanType()) ? "您的账号已被永久封禁" : "您的账号已被临时封禁";
              return RiskCheckResponse.builder()
                  .passed(false)
                  .action("reject")
                  .reason(ban.getReason())
                  .category("blacklist")
                  .statusCode(403)
                  .message(message)
                  .build();
            })
        .orElse(passed());
  }

  private RiskCheckResponse passed() {
    return RiskCheckResponse.builder().passed(true).build();
  }
}
