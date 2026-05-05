package cn.edu.cqut.advisorplatform.riskcontrol.repository;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserBehaviorStat;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserBehaviorStatRepository extends JpaRepository<UserBehaviorStat, Long> {

    Optional<UserBehaviorStat> findByUserIdAndDate(Long userId, LocalDate date);
}
