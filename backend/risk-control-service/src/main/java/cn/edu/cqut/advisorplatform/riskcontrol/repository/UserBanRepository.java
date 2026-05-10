package cn.edu.cqut.advisorplatform.riskcontrol.repository;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBan;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserBanRepository extends JpaRepository<UserBan, Long> {

  @Query(
      "SELECT b FROM UserBan b WHERE b.userId = :userId AND b.isActive = true AND (b.endTime IS NULL OR b.endTime > :now) ORDER BY b.createdAt DESC LIMIT 1")
  Optional<UserBan> findActiveBanByUserId(
      @Param("userId") Long userId, @Param("now") LocalDateTime now);
}
