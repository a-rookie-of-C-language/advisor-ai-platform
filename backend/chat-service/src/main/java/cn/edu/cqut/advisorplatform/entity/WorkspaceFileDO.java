package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "workspace_file")
public class WorkspaceFileDO {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "session_id", nullable = false)
  private ChatSessionDO session;

  @Column(nullable = false, length = 256)
  private String fileName;

  @Column(nullable = false, length = 32)
  private String fileType;

  @Column(nullable = false)
  private Long fileSize = 0L;

  @Column(nullable = false, length = 512)
  private String filePath;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "uploaded_by")
  private UserDO uploadedBy;

  @Column(updatable = false)
  private LocalDateTime createdAt;
}
