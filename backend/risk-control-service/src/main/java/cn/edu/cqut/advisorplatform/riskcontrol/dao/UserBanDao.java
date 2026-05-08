package cn.edu.cqut.advisorplatform.riskcontrol.dao;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBan;
import java.time.LocalDateTime;
import java.util.Optional;

public interface UserBanDao {

  Optional<UserBan> findActiveBanByUserId(Long userId, LocalDateTime now);
}
