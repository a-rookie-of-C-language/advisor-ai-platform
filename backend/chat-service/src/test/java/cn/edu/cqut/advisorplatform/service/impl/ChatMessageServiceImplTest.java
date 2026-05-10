package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.mapper.ChatMessageMapper;
import cn.edu.cqut.advisorplatform.mapper.ChatSessionMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceImplTest {
  @Mock private ChatMessageMapper chatMessageMapper;
  @Mock private ChatSessionMapper chatSessionMapper;
  @InjectMocks private ChatMessageServiceImpl chatMessageService;

  private ChatSessionDO session;

  @BeforeEach
  void setUp() {
    session = new ChatSessionDO();
    session.setId(1001L);
    session.setUserId(1L);
    session.setTitle("新对话");
  }

  @Test
  void saveTurn_shouldInsertBothUserAndAssistantMessages() {
    when(chatSessionMapper.selectById(1001L)).thenReturn(session);
    when(chatMessageMapper.existsBySessionIdAndTurnIdAndRole(1001L, "turn-1", "assistant")).thenReturn(false);
    when(chatMessageMapper.existsBySessionIdAndRole(1001L, "user")).thenReturn(false);
    when(chatMessageMapper.existsBySessionIdAndTurnIdAndRole(1001L, "turn-1", "user")).thenReturn(false);

    chatMessageService.saveTurn(1001L, 1L, "turn-1", "abcdefghi", "ok");

    verify(chatSessionMapper).update(session);
    verify(chatMessageMapper, times(2)).insert(any(ChatMessageDO.class));
  }

  @Test
  void findAssistantContent_shouldReturnNullWhenMissing() {
    when(chatSessionMapper.selectById(1001L)).thenReturn(session);
    when(chatMessageMapper.selectFirstBySessionIdAndTurnIdAndRole(1001L, "turn-4", "assistant")).thenReturn(null);

    String result = chatMessageService.findAssistantContent(1001L, 1L, "turn-4");

    assertThat(result).isNull();
  }
}
