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
@Table(name = "tracking_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(name = "event_type", length = 32, nullable = false)
    private String eventType;

    @Column(name = "event_name", length = 64, nullable = false)
    private String eventName;

    @Column(name = "page_url", length = 512)
    private String pageUrl;

    @Column(name = "element_id", length = 128)
    private String elementId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "extra_data", columnDefinition = "jsonb")
    private String extraData;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
