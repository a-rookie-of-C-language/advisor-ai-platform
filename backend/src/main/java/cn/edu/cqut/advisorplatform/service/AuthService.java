package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;

public interface AuthService {

    LoginResponseDTO login(LoginRequestDTO request);

    void register(RegisterRequestDTO request);
}
