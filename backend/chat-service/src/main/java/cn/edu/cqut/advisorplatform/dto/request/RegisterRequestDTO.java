package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
<<<<<<< HEAD
=======
import org.springframework.lang.Nullable;
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)

@Data
public class RegisterRequestDTO {

<<<<<<< HEAD
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
=======
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
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
