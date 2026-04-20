package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequestDTO {

  @NotBlank(message = "用户名不能为空")
  @Size(min = 3, max = 64)
  private String username;

  @NotBlank(message = "密码不能为空")
  @Size(min = 6, max = 128)
  private String password;

  @NotBlank(message = "姓名不能为空")
  private String realName;

  private String phone;

  private String email;
}
