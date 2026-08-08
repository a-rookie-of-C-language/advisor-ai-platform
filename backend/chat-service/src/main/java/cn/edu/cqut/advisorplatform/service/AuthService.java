package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.auth.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.auth.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.auth.LoginResponseDTO;

public interface AuthService {

  LoginResponseDTO login(LoginRequestDTO request);

  void register(RegisterRequestDTO request);
}
