package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.UserDao;
import cn.edu.cqut.advisorplatform.dto.request.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.LogoutRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RefreshTokenRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.AuthService;
import cn.edu.cqut.advisorplatform.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

  private final UserDao userDao;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final RefreshTokenService refreshTokenService;

  @Override
  public LoginResponseDTO login(LoginRequestDTO request) {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
    UserDO user =
        userDao
            .findByUsername(request.getUsername())
            .orElseThrow(() -> new NotFoundException("用户不存在"));

    TokenPairResponseDTO tokenPair = refreshTokenService.issueTokenPair(user);
    return LoginResponseDTO.of(
        tokenPair.getAccessToken(),
        tokenPair.getRefreshToken(),
        tokenPair.getAccessExpiresIn(),
        tokenPair.getRefreshExpiresIn(),
        user);
  }

  @Override
  public void register(RegisterRequestDTO request) {
    if (userDao.existsByUsername(request.getUsername())) {
      throw new BadRequestException("用户名已存在");
    }
    UserDO user = new UserDO();
    user.setUsername(request.getUsername());
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setRealName(request.getRealName());
    user.setPhone(request.getPhone());
    user.setEmail(request.getEmail());
    user.setRole(UserDO.UserRole.ADVISOR);
    userDao.save(user);
  }

  @Override
  public TokenPairResponseDTO refresh(RefreshTokenRequestDTO request) {
    return refreshTokenService.refresh(request.getRefreshToken());
  }

  @Override
  public void logout(LogoutRequestDTO request) {
    refreshTokenService.logout(request.getRefreshToken());
  }

  @Override
  public void logoutAll(Long userId) {
    refreshTokenService.logoutAll(userId);
  }
}
