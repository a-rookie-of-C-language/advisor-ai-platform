package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.dao.UserIdentityDao;
import cn.edu.cqut.advisorplatform.dto.response.UserIdentityResponse;
import cn.edu.cqut.advisorplatform.entity.UserIdentityDO;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InternalIdentityServiceImplTest {
  @InjectMocks private InternalIdentityServiceImpl internalIdentityService;

  @Mock private UserIdentityDao userIdentityDao;

  @Test
  void getIdentity_whenIdentityExists_shouldReturnResponse() {
    UserIdentityDO identity = new UserIdentityDO();
    identity.setUserId(7L);
    identity.setIdentityType("student");
    identity.setIdentityNo("S001");

    when(userIdentityDao.findByUserIdAndIdentityType(7L, "student"))
        .thenReturn(Optional.of(identity));

    UserIdentityResponse response = internalIdentityService.getIdentity(7L, "student");

    assertThat(response).isNotNull();
    assertThat(response.getUserId()).isEqualTo(7L);
    assertThat(response.getIdentityType()).isEqualTo("student");
    assertThat(response.getIdentityNo()).isEqualTo("S001");
    verify(userIdentityDao).findByUserIdAndIdentityType(7L, "student");
  }

  @Test
  void getIdentity_whenIdentityMissing_shouldReturnNull() {
    when(userIdentityDao.findByUserIdAndIdentityType(8L, "teacher")).thenReturn(Optional.empty());

    UserIdentityResponse response = internalIdentityService.getIdentity(8L, "teacher");

    assertThat(response).isNull();
    verify(userIdentityDao).findByUserIdAndIdentityType(8L, "teacher");
  }
}
