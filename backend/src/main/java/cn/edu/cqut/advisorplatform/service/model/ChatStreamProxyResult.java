package cn.edu.cqut.advisorplatform.service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.lang.Nullable;

@Data
@AllArgsConstructor
public class ChatStreamProxyResult {

    @Nullable
    private String assistantText;
}
