package cn.edu.cqut.advisorplatform.service.impl.auth;

import cn.edu.cqut.advisorplatform.common.security.JwtUtil;
import cn.edu.cqut.advisorplatform.dao.user.UserDao;
import cn.edu.cqut.advisorplatform.dto.request.auth.LoginRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.auth.RegisterRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.auth.LoginResponseDTO;
import cn.edu.cqut.advisorplatform.entity.user.UserDO;
import cn.edu.cqut.advisorplatform.entity.user.UserRole;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.auth.AuthService;
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
  private final JwtUtil jwtUtil;
  private final AuthenticationManager authenticationManager;

  @Override
  public LoginResponseDTO login(LoginRequestDTO request) {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
    UserDO user =
        userDao
            .findByUsername(request.getUsername())
            .orElseThrow(() -> new NotFoundException("用户不存在"));
    String token = jwtUtil.generateToken(user);
    return LoginResponseDTO.of(token, user);
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
    user.setRole(UserRole.ADVISOR);
    userDao.save(user);
  }
}
