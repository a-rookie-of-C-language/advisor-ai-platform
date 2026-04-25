package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LogoutRequestDTO {

  @NotBlank
  private String refreshToken;
}
