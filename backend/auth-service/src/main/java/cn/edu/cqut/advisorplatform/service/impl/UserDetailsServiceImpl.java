package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.UserDao;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserDao userDao;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userDao.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("用户不存在：" + username));
    }
}
