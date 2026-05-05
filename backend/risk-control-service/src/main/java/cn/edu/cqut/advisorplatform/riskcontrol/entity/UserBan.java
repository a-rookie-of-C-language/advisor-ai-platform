package cn.edu.cqut.advisorplatform.riskcontrol.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_bans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "ban_type", length = 32, nullable = false)
  private String banType;

  @Column(name = "reason")
  private String reason;

  @Column(name = "start_time", nullable = false)
  private LocalDateTime startTime;

  @Column(name = "end_time")
  private LocalDateTime endTime;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive;

  @Column(name = "created_by", length = 64)
  private String createdBy;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;
}
