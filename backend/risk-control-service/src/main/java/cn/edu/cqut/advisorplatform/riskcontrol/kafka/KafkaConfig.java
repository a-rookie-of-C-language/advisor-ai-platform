package cn.edu.cqut.advisorplatform.riskcontrol.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String TRACKING_EVENTS_TOPIC = "tracking-events";
    public static final String RISK_ALERTS_TOPIC = "risk-alerts";

    @Bean
    public NewTopic trackingEventsTopic() {
        return TopicBuilder.name(TRACKING_EVENTS_TOPIC)
                .partitions(8)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic riskAlertsTopic() {
        return TopicBuilder.name(RISK_ALERTS_TOPIC)
                .partitions(4)
                .replicas(1)
                .build();
    }
}
