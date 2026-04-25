package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import lombok.Data;

@Data
public class LoginResponseDTO {

  private String accessToken;
  private String token;
  private String refreshToken;
  private Long accessExpiresIn;
  private Long refreshExpiresIn;
  private String username;
  private String realName;
  private String role;

  public static LoginResponseDTO of(
      String accessToken,
      String refreshToken,
      Long accessExpiresIn,
      Long refreshExpiresIn,
      UserDO user) {
    LoginResponseDTO resp = new LoginResponseDTO();
    resp.setAccessToken(accessToken);
    resp.setToken(accessToken);
    resp.setRefreshToken(refreshToken);
    resp.setAccessExpiresIn(accessExpiresIn);
    resp.setRefreshExpiresIn(refreshExpiresIn);
    resp.setUsername(user.getUsername());
    resp.setRealName(user.getRealName());
    resp.setRole(user.getRole().name());
    return resp;
  }
}
