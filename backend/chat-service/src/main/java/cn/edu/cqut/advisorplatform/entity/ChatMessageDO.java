package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
<<<<<<< HEAD
import java.time.LocalDateTime;
import java.util.List;
=======
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

<<<<<<< HEAD
=======
import java.time.LocalDateTime;
import java.util.List;

>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
@Data
@NoArgsConstructor
@Entity
@Table(name = "chat_message")
public class ChatMessageDO {

<<<<<<< HEAD
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "session_id", nullable = false)
  private ChatSessionDO session;

  @Column(name = "turn_id", nullable = false, length = 64)
  private String turnId;

  @Column(nullable = false, length = 16)
  private String role;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private List<SourceReference> sources;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private List<Long> attachments;

  @Column(updatable = false)
  private LocalDateTime createdAt;

  @Data
  @NoArgsConstructor
  public static class SourceReference {
    private Long documentId;
    private String docName;
    private String snippet;
  }
=======
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSessionDO session;

    @Column(name = "turn_id", nullable = false, length = 64)
    private String turnId;

    @Column(nullable = false, length = 16)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<SourceReference> sources;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Data
    @NoArgsConstructor
    public static class SourceReference {
        private Long documentId;
        private String docName;
        private String snippet;
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
