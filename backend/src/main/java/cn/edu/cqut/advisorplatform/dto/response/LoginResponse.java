package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.User;
import lombok.Data;

@Data
public class LoginResponse {

    private String token;
    private String username;
    private String realName;
    private String role;

    public static LoginResponse of(String token, User user) {
        LoginResponse resp = new LoginResponse();
        resp.setToken(token);
        resp.setUsername(user.getUsername());
        resp.setRealName(user.getRealName());
        resp.setRole(user.getRole().name());
        return resp;
    }
}
