package cn.edu.cqut.advisorplatform.service.model;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.lang.Nullable;

@Data
@AllArgsConstructor
public class ChatStreamProxyResult {

  @Nullable private String assistantText;

  @Nullable private List<ChatMessageDO.SourceReference> sources;

  public ChatStreamProxyResult(@Nullable String assistantText) {
    this(assistantText, List.of());
  }
}
