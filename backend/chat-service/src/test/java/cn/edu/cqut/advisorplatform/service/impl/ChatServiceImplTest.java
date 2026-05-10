package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.client.RagServiceClient;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.mapper.ChatMessageMapper;
import cn.edu.cqut.advisorplatform.mapper.ChatSessionMapper;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {
  @Mock private ChatSessionMapper chatSessionMapper;
  @Mock private ChatMessageMapper chatMessageMapper;
  @Mock private RagServiceClient ragServiceClient;
  @InjectMocks private ChatServiceImpl chatService;

  @Test
  void createSession_shouldPersistDefaultKbIdAsZero() {
    UserDO user = buildUser();
    chatService.createSession(user);
    ArgumentCaptor<ChatSessionDO> captor = ArgumentCaptor.forClass(ChatSessionDO.class);
    verify(chatSessionMapper).insert(captor.capture());
    assertThat(captor.getValue().getKbId()).isEqualTo(0L);
    assertThat(captor.getValue().getUserId()).isEqualTo(1L);
  }

  @Test
  void getSessionKbId_shouldFallbackToZeroWhenNull() {
    UserDO user = buildUser();
    ChatSessionDO session = new ChatSessionDO();
    session.setId(1001L);
    session.setKbId(null);
    session.setUserId(1L);
    when(chatSessionMapper.selectById(1001L)).thenReturn(session);
    long kbId = chatService.getSessionKbId(1001L, user);
    assertThat(kbId).isEqualTo(0L);
  }

  @Test
  void updateSessionKb_shouldUseRemoteRagCheck() {
    UserDO user = buildUser();
    ChatSessionDO session = new ChatSessionDO();
    session.setId(2001L);
    session.setKbId(0L);
    session.setUserId(1L);
    when(chatSessionMapper.selectById(2001L)).thenReturn(session);
    when(ragServiceClient.existsKnowledgeBase(3001L)).thenReturn(ApiResponseDTO.success(Map.of("exists", true)));
    chatService.updateSessionKb(2001L, 3001L, user);
    assertThat(session.getKbId()).isEqualTo(3001L);
    verify(ragServiceClient).existsKnowledgeBase(3001L);
  }

  private UserDO buildUser() {
    UserDO user = new UserDO();
    user.setId(1L);
    return user;
  }
}
