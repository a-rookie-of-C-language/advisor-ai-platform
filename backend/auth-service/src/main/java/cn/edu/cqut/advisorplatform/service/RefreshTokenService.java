package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;

public interface RefreshTokenService {

  TokenPairResponseDTO issueTokenPair(UserDO user);

  TokenPairResponseDTO refresh(String refreshToken);

  void logout(String refreshToken);

  void logoutAll(Long userId);
}
