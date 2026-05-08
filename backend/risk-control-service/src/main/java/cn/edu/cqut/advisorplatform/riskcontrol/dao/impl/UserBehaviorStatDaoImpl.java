package cn.edu.cqut.advisorplatform.riskcontrol.dao.impl;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.UserBehaviorStatDao;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBehaviorStat;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserBehaviorStatRepository;
import java.time.LocalDate;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserBehaviorStatDaoImpl implements UserBehaviorStatDao {

  private final UserBehaviorStatRepository userBehaviorStatRepository;

  @Override
  public Optional<UserBehaviorStat> findByUserIdAndDate(Long userId, LocalDate date) {
    return userBehaviorStatRepository.findByUserIdAndDate(userId, date);
  }
}
