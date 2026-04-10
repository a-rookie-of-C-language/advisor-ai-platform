package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.config.security.JwtUtil;
import cn.edu.cqut.advisorplatform.dao.UserDao;
import cn.edu.cqut.advisorplatform.dto.request.LoginRequest;
import cn.edu.cqut.advisorplatform.dto.request.RegisterRequest;
import cn.edu.cqut.advisorplatform.dto.response.LoginResponse;
import cn.edu.cqut.advisorplatform.entity.User;
import cn.edu.cqut.advisorplatform.service.AuthService;
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
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = userDao.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        String token = jwtUtil.generateToken(user);
        return LoginResponse.of(token, user);
    }

    @Override
    public void register(RegisterRequest request) {
        if (userDao.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRealName(request.getRealName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setRole(User.UserRole.ADVISOR);
        userDao.save(user);
    }
}
