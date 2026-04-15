package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;
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
    public ApiResponseDTO<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ApiResponseDTO.success(authService.login(request));
    }

    @PostMapping("/register")
    public ApiResponseDTO<Void> register(@Valid @RequestBody RegisterRequestDTO request) {
        authService.register(request);
        return ApiResponseDTO.success();
    }
}
