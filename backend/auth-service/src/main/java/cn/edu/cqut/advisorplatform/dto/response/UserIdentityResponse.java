package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.UserIdentityDO;
import lombok.Data;

@Data
public class UserIdentityResponse {
  private Long userId;
  private String identityType;
  private String identityNo;

  public static UserIdentityResponse from(UserIdentityDO identity) {
    UserIdentityResponse response = new UserIdentityResponse();
    response.setUserId(identity.getUserId());
    response.setIdentityType(identity.getIdentityType());
    response.setIdentityNo(identity.getIdentityNo());
    return response;
  }
}
