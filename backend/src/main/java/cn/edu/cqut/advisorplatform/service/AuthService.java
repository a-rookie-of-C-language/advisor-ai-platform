package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequest;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequest;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    void register(RegisterRequest request);
}
