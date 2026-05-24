package cn.edu.cqut.advisorplatform.riskcontrol.dao.impl;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.UserBanDao;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBan;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserBanRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserBanDaoImpl implements UserBanDao {

  private final UserBanRepository userBanRepository;

  @Override
  public Optional<UserBan> findActiveBanByUserId(Long userId, LocalDateTime now) {
    return userBanRepository.findActiveBanByUserId(userId, now);
  }
}
