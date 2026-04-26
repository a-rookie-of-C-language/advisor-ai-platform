package cn.edu.cqut.advisorplatform.dto.response;

import lombok.Data;

@Data
public class TokenPairResponseDTO {

  private String accessToken;
  private String token;
  private String refreshToken;
  private Long accessExpiresIn;
  private Long refreshExpiresIn;

  public static TokenPairResponseDTO of(
      String accessToken, String refreshToken, Long accessExpiresIn, Long refreshExpiresIn) {
    TokenPairResponseDTO resp = new TokenPairResponseDTO();
    resp.setAccessToken(accessToken);
    resp.setToken(accessToken);
    resp.setRefreshToken(refreshToken);
    resp.setAccessExpiresIn(accessExpiresIn);
    resp.setRefreshExpiresIn(refreshExpiresIn);
    return resp;
  }
}
