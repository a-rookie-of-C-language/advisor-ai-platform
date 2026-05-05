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
@Table(name = "user_violations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "violation_type", length = 32, nullable = false)
    private String violationType;

    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "request_path", length = 512)
    private String requestPath;

    @Column(name = "request_body")
    private String requestBody;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
