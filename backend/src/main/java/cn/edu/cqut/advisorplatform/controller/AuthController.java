package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequest;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequest;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponse;
import cn.edu.cqut.advisorplatform.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ApiResponse.success();
    }
}
