package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.UserIdentityResponse;

public interface InternalIdentityService {
  UserIdentityResponse getIdentity(Long userId, String identityType);
}
