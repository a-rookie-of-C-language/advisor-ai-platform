package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.LogoutRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RefreshTokenRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

  @PostMapping("/refresh")
  public ApiResponseDTO<TokenPairResponseDTO> refresh(
      @Valid @RequestBody RefreshTokenRequestDTO request) {
    return ApiResponseDTO.success(authService.refresh(request));
  }

  @PostMapping("/logout")
  public ApiResponseDTO<Void> logout(@Valid @RequestBody LogoutRequestDTO request) {
    authService.logout(request);
    return ApiResponseDTO.success();
  }

  @PostMapping("/logout-all")
  public ApiResponseDTO<Void> logoutAll(@AuthenticationPrincipal @Nullable UserDO currentUser) {
    if (currentUser != null && currentUser.getId() != null) {
      authService.logoutAll(currentUser.getId());
    }
    return ApiResponseDTO.success();
  }
}
