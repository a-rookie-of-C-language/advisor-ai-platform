package cn.edu.cqut.advisorplatform.riskcontrol.dao;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserViolation;
import java.time.LocalDateTime;

public interface UserViolationDao {

  UserViolation save(UserViolation violation);

  long countByUserIdSince(Long userId, LocalDateTime since);
}
