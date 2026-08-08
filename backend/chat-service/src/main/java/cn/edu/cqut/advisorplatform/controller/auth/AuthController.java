package cn.edu.cqut.advisorplatform.controller.auth;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.dto.request.auth.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.auth.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.auth.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditModule;
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
  @Auditable(
      module = AuditModule.AUTH,
      action = AuditAction.LOGIN,
      logRequestParams = false,
      logResponseData = false)
  public ApiResponseDTO<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
    return ApiResponseDTO.success(authService.login(request));
  }

  @PostMapping("/register")
  @Auditable(
      module = AuditModule.AUTH,
      action = AuditAction.STORE,
      logRequestParams = false,
      logResponseData = false)
  public ApiResponseDTO<Void> register(@Valid @RequestBody RegisterRequestDTO request) {
    authService.register(request);
    return ApiResponseDTO.success();
  }
}
