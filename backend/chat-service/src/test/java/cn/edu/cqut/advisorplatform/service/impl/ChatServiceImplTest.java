package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {

  @Mock private ChatSessionDao chatSessionDao;

  @Mock private ChatMessageDao chatMessageDao;

  @InjectMocks private ChatServiceImpl chatService;

  @Test
  void createSession_shouldPersistDefaultKbIdAsZero() {
    UserDO user = buildUser();

    ChatSessionDO saved = new ChatSessionDO();
    saved.setId(1001L);
    saved.setTitle("\u65b0\u5bf9\u8bdd");
    saved.setKbId(0L);
    saved.setUser(user);
    when(chatSessionDao.save(org.mockito.ArgumentMatchers.any(ChatSessionDO.class)))
        .thenReturn(saved);

    chatService.createSession(user);

    ArgumentCaptor<ChatSessionDO> captor = ArgumentCaptor.forClass(ChatSessionDO.class);
    verify(chatSessionDao).save(captor.capture());
    assertThat(captor.getValue().getKbId()).isEqualTo(0L);
  }

  @Test
  void getSessionKbId_shouldFallbackToZeroWhenNull() {
    UserDO user = buildUser();
    ChatSessionDO session = new ChatSessionDO();
    session.setId(1001L);
    session.setKbId(null);
    session.setUser(user);

    when(chatSessionDao.findById(1001L)).thenReturn(Optional.of(session));

    long kbId = chatService.getSessionKbId(1001L, user);

    assertThat(kbId).isEqualTo(0L);
  }

  private UserDO buildUser() {
    UserDO user = new UserDO();
    user.setId(1L);
    return user;
  }
}
