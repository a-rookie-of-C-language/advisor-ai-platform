package cn.edu.cqut.advisorplatform.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.LogoutRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RefreshTokenRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

  @InjectMocks private AuthController authController;

  @Mock private AuthService authService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void login_shouldReturnSuccess() {
    LoginRequestDTO request = new LoginRequestDTO();
    request.setUsername("testuser");
    request.setPassword("password123");

    LoginResponseDTO response = new LoginResponseDTO();
    response.setAccessToken("access-token");
    response.setRefreshToken("refresh-token");

    when(authService.login(any(LoginRequestDTO.class))).thenReturn(response);

    var result = authController.login(request);
    assert result.getCode() == 200;
    assert result.getData().getAccessToken().equals("access-token");
  }

  @Test
  void register_shouldReturnSuccess() {
    RegisterRequestDTO request = new RegisterRequestDTO();
    request.setUsername("newuser");
    request.setPassword("password123");
    request.setRealName("New User");

    doNothing().when(authService).register(any(RegisterRequestDTO.class));

    var result = authController.register(request);
    assert result.getCode() == 200;
  }

  @Test
  void refresh_shouldReturnSuccess() {
    RefreshTokenRequestDTO request = new RefreshTokenRequestDTO();
    request.setRefreshToken("valid-refresh-token");

    TokenPairResponseDTO response = new TokenPairResponseDTO();
    response.setAccessToken("new-access-token");
    response.setRefreshToken("new-refresh-token");

    when(authService.refresh(any(RefreshTokenRequestDTO.class))).thenReturn(response);

    var result = authController.refresh(request);
    assert result.getCode() == 200;
    assert result.getData().getAccessToken().equals("new-access-token");
  }

  @Test
  void logout_shouldReturnSuccess() {
    LogoutRequestDTO request = new LogoutRequestDTO();
    request.setRefreshToken("token-to-revoke");

    doNothing().when(authService).logout(any(LogoutRequestDTO.class));

    var result = authController.logout(request);
    assert result.getCode() == 200;
  }
}
