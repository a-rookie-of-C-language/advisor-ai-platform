package cn.edu.cqut.advisorplatform.feedback.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "sys_user")
public class UserDO {

  @Id private Long id;

  @Column(nullable = false, unique = true, length = 64)
  private String username;

  @Column(nullable = false, length = 64)
  private String realName;

  @Column(length = 128)
  private String email;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserRole role = UserRole.ADVISOR;

  @Column(nullable = false)
  private Boolean enabled = true;

  @Column(updatable = false)
  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;
}
