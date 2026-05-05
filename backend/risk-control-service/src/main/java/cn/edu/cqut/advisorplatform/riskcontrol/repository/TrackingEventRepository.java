package cn.edu.cqut.advisorplatform.riskcontrol.repository;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.TrackingEvent;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TrackingEventRepository extends JpaRepository<TrackingEvent, Long> {

    @Query("SELECT COUNT(t) FROM TrackingEvent t WHERE t.userId = :userId AND t.createdAt >= :since")
    long countByUserIdSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT t FROM TrackingEvent t WHERE t.userId = :userId ORDER BY t.createdAt DESC LIMIT :limit")
    List<TrackingEvent> findRecentByUserId(@Param("userId") Long userId, @Param("limit") int limit);
}
