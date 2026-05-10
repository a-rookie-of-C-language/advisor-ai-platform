package cn.edu.cqut.advisorplatform.riskcontrol.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_behavior_stats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBehaviorStat {

  @Id
  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "date", nullable = false)
  private LocalDate date;

  @Column(name = "request_count", nullable = false)
  private Integer requestCount;

  @Column(name = "violation_count", nullable = false)
  private Integer violationCount;

  @Column(name = "avg_interval_seconds")
  private Double avgIntervalSeconds;

  @Column(name = "suspicious_pattern")
  private String suspiciousPattern;
}
