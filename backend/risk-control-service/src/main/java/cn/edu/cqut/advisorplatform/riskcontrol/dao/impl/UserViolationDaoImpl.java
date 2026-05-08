package cn.edu.cqut.advisorplatform.riskcontrol.dao.impl;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.UserViolationDao;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserViolation;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserViolationRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserViolationDaoImpl implements UserViolationDao {

  private final UserViolationRepository userViolationRepository;

  @Override
  public UserViolation save(UserViolation violation) {
    return userViolationRepository.save(violation);
  }

  @Override
  public long countByUserIdSince(Long userId, LocalDateTime since) {
    return userViolationRepository.countByUserIdSince(userId, since);
  }
}
