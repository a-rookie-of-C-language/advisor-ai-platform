package cn.edu.cqut.advisorplatform.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dao.UserDao;
import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.RefreshTokenService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

  @InjectMocks private AuthServiceImpl authService;

  @Mock private UserDao userDao;

  @Mock private PasswordEncoder passwordEncoder;

  @Mock private AuthenticationManager authenticationManager;

  @Mock private RefreshTokenService refreshTokenService;

  @Test
  void login_shouldReturnTokens() {
    LoginRequestDTO request = new LoginRequestDTO();
    request.setUsername("testuser");
    request.setPassword("password123");

    UserDO user = new UserDO();
    user.setId(1L);
    user.setUsername("testuser");
    user.setRole(UserDO.UserRole.ADVISOR);

    TokenPairResponseDTO tokenPair = new TokenPairResponseDTO();
    tokenPair.setAccessToken("access-token");
    tokenPair.setRefreshToken("refresh-token");

    when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
        .thenReturn(null);
    when(userDao.findByUsername("testuser")).thenReturn(Optional.of(user));
    when(refreshTokenService.issueTokenPair(user)).thenReturn(tokenPair);

    LoginResponseDTO result = authService.login(request);

    assertNotNull(result);
    assertEquals("access-token", result.getAccessToken());
    verify(authenticationManager).authenticate(any());
    verify(userDao).findByUsername("testuser");
  }

  @Test
  void login_withInvalidCredentials_shouldThrowException() {
    LoginRequestDTO request = new LoginRequestDTO();
    request.setUsername("testuser");
    request.setPassword("wrong-password");

    when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
        .thenThrow(new BadCredentialsException("Bad credentials"));

    assertThrows(BadCredentialsException.class, () -> authService.login(request));
  }

  @Test
  void register_shouldCreateUser() {
    RegisterRequestDTO request = new RegisterRequestDTO();
    request.setUsername("newuser");
    request.setPassword("password123");
    request.setRealName("New User");

    when(userDao.existsByUsername("newuser")).thenReturn(false);
    when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
    when(userDao.save(any(UserDO.class))).thenAnswer(invocation -> invocation.getArgument(0));

    authService.register(request);

    verify(userDao).existsByUsername("newuser");
    verify(passwordEncoder).encode("password123");
    verify(userDao).save(any(UserDO.class));
  }

  @Test
  void register_withExistingUsername_shouldThrowException() {
    RegisterRequestDTO request = new RegisterRequestDTO();
    request.setUsername("existinguser");
    request.setPassword("password123");
    request.setRealName("User");

    when(userDao.existsByUsername("existinguser")).thenReturn(true);

    assertThrows(BadRequestException.class, () -> authService.register(request));
    verify(userDao, never()).save(any());
  }

  @Test
  void logoutAll_shouldCallRefreshTokenService() {
    Long userId = 1L;

    doNothing().when(refreshTokenService).logoutAll(userId);

    authService.logoutAll(userId);

    verify(refreshTokenService).logoutAll(userId);
  }
}
