package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.client.RagServiceClient;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {

  @Mock private ChatSessionDao chatSessionDao;

  @Mock private ChatMessageDao chatMessageDao;

  @Mock private RagServiceClient ragServiceClient;

  private ChatServiceImpl chatService;

  @org.junit.jupiter.api.BeforeEach
  void setUp() {
    chatService =
        new ChatServiceImpl(
            chatSessionDao, chatMessageDao, new ChatSessionSupport(ragServiceClient));
  }

  @Test
  void createSession_shouldPersistDefaultKbIdAsZero() {
    UserPrincipal user = buildPrincipal();

    ChatSessionDO saved = new ChatSessionDO();
    saved.setId(1001L);
    saved.setTitle("新对话");
    saved.setKbId(0L);
    saved.setUser(buildUser());
    when(chatSessionDao.save(org.mockito.ArgumentMatchers.any(ChatSessionDO.class)))
        .thenReturn(saved);

    chatService.createSession(user);

    ArgumentCaptor<ChatSessionDO> captor = ArgumentCaptor.forClass(ChatSessionDO.class);
    verify(chatSessionDao).save(captor.capture());
    assertThat(captor.getValue().getKbId()).isEqualTo(0L);
  }

  @Test
  void getSessionKbId_shouldFallbackToZeroWhenNull() {
    UserPrincipal user = buildPrincipal();
    ChatSessionDO session = new ChatSessionDO();
    session.setId(1001L);
    session.setKbId(null);
    session.setUser(buildUser());

    when(chatSessionDao.findById(1001L)).thenReturn(Optional.of(session));

    long kbId = chatService.getSessionKbId(1001L, user);

    assertThat(kbId).isEqualTo(0L);
  }

  @Test
  void updateSessionKb_shouldUseRemoteRagCheck() {
    UserPrincipal user = buildPrincipal();
    ChatSessionDO session = new ChatSessionDO();
    session.setId(2001L);
    session.setKbId(0L);
    session.setUser(buildUser());

    when(chatSessionDao.findById(2001L)).thenReturn(Optional.of(session));
    when(ragServiceClient.existsKnowledgeBase(3001L))
        .thenReturn(ApiResponseDTO.success(Map.of("exists", true)));
    when(chatSessionDao.save(session)).thenReturn(session);

    chatService.updateSessionKb(2001L, 3001L, user);

    assertThat(session.getKbId()).isEqualTo(3001L);
    verify(ragServiceClient).existsKnowledgeBase(3001L);
  }

  private UserPrincipal buildPrincipal() {
    return new UserPrincipal(1L, "tester", "ADVISOR");
  }

  private UserDO buildUser() {
    UserDO user = new UserDO();
    user.setId(1L);
    return user;
  }
}
