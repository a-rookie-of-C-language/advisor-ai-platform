package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import lombok.Data;

@Data
public class LoginResponseDTO {

    private String token;
    private String username;
    private String realName;
    private String role;

    public static LoginResponseDTO of(String token, UserDO user) {
        LoginResponseDTO resp = new LoginResponseDTO();
        resp.setToken(token);
        resp.setUsername(user.getUsername());
        resp.setRealName(user.getRealName());
        resp.setRole(user.getRole().name());
        return resp;
    }
}
