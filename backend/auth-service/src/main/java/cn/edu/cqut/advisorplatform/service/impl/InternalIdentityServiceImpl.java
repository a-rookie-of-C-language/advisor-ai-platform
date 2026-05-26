package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.UserIdentityDao;
import cn.edu.cqut.advisorplatform.dto.response.UserIdentityResponse;
import cn.edu.cqut.advisorplatform.service.InternalIdentityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InternalIdentityServiceImpl implements InternalIdentityService {
  private final UserIdentityDao userIdentityDao;

  @Override
  public UserIdentityResponse getIdentity(Long userId, String identityType) {
    return userIdentityDao
        .findByUserIdAndIdentityType(userId, identityType)
        .map(UserIdentityResponse::from)
        .orElse(null);
  }
}
