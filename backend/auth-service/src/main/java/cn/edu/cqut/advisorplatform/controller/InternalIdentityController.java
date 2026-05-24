package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dao.UserIdentityDao;
import cn.edu.cqut.advisorplatform.dto.response.UserIdentityResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/identity")
@RequiredArgsConstructor
public class InternalIdentityController {
  private final UserIdentityDao userIdentityDao;

  @GetMapping("/user/{userId}")
  public UserIdentityResponse getIdentity(
      @PathVariable("userId") Long userId, @RequestParam("type") String identityType) {
    return userIdentityDao
        .findByUserIdAndIdentityType(userId, identityType)
        .map(UserIdentityResponse::from)
        .orElse(null);
  }
}
