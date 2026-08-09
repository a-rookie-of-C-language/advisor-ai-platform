package cn.edu.cqut.advisorplatform.service.model;

import cn.edu.cqut.advisorplatform.entity.chat.SourceReference;
import cn.edu.cqut.advisorplatform.entity.chat.StreamEventRecord;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.lang.Nullable;

@Data
@AllArgsConstructor
public class ChatStreamProxyResult {

  @Nullable private String assistantText;

  @Nullable private List<SourceReference> sources;

  @Nullable private List<StreamEventRecord> events;

  public ChatStreamProxyResult(@Nullable String assistantText) {
    this(assistantText, List.of(), List.of());
  }

  public ChatStreamProxyResult(
      @Nullable String assistantText, @Nullable List<SourceReference> sources) {
    this(assistantText, sources, List.of());
  }
}
