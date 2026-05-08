package cn.edu.cqut.advisorplatform.riskcontrol.dao;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBehaviorStat;
import java.time.LocalDate;
import java.util.Optional;

public interface UserBehaviorStatDao {

  Optional<UserBehaviorStat> findByUserIdAndDate(Long userId, LocalDate date);
}
