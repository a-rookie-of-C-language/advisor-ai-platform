package cn.edu.cqut.advisorplatform.common.security;

import java.util.Collection;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Data
@NoArgsConstructor
public class UserPrincipal implements UserDetails {

  private Long id;
  private String username;
  private String password;
  private String realName;
  private UserRole role;
  private boolean enabled;

  public UserPrincipal(Long id, String username, String role) {
    this.id = id;
    this.username = username;
    this.role = UserRole.valueOf(role.toUpperCase());
    this.enabled = true;
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
