package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.LogoutRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RefreshTokenRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;

public interface AuthService {

  LoginResponseDTO login(LoginRequestDTO request);

  void register(RegisterRequestDTO request);

  TokenPairResponseDTO refresh(RefreshTokenRequestDTO request);

  void logout(LogoutRequestDTO request);

  void logoutAll(Long userId);
}
