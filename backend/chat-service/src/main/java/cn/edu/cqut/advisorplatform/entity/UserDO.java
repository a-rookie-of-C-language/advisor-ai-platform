package cn.edu.cqut.advisorplatform.entity;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Data
@NoArgsConstructor
public class UserDO implements UserDetails {

  private Long id;

  private String username;

  private String password;

  private String realName;

  private String phone;

  private String email;

  private UserRole role = UserRole.ADVISOR;

  private Boolean enabled = true;

  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;

  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
  }

  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return enabled;
  }

  public enum UserRole {
    ADMIN,
    ADVISOR,
    EXPERT
  }
}
