package cn.edu.cqut.advisorplatform.checkin.client.dto;

import lombok.Data;

@Data
public class UserIdentityResponse {
  private Long userId;
  private String identityType;
  private String identityNo;
}
