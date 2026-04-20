package cn.edu.cqut.advisorplatform.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.service.ChatService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatControllerSendMessageConsistencyTest {

  @Mock private AgentProxyService agentProxyService;

  @Mock private ChatService chatService;

  @Mock private ChatMessageService chatMessageService;

  @InjectMocks private ChatController chatController;

  @Test
  void sendMessage_shouldReturnCachedAnswerWithoutCallingAgent() throws Exception {
    UserDO user = buildUser();
    Map<String, String> body = Map.of("content", "hello", "kbId", "999");
    when(chatService.getSessionKbId(1001L, user)).thenReturn(0L);
    when(chatService.listMessages(1001L, user))
        .thenReturn(List.of(Map.of("role", "user", "content", "history")));
    when(chatMessageService.findAssistantContent(eq(1001L), eq(1L), anyString()))
        .thenReturn("cached answer");

    ApiResponseDTO<Map<String, Object>> response = chatController.sendMessage(1001L, body, user);

    assertThat(response.getCode()).isEqualTo(200);
    assertThat(response.getData()).isNotNull();
    assertThat(String.valueOf(response.getData().get("role"))).isEqualTo("assistant");
    assertThat(String.valueOf(response.getData().get("content"))).isEqualTo("cached answer");
    verify(agentProxyService, never()).proxyChatOnce(any(ChatStreamRequestDTO.class), anyLong());
    verify(chatMessageService, never())
        .saveTurn(anyLong(), anyLong(), anyString(), anyString(), anyString());
  }

  @Test
  void sendMessage_shouldIgnoreClientKbIdAndUseSessionKbId() throws Exception {
    UserDO user = buildUser();
    Map<String, String> body = Map.of("content", "hello", "kbId", "999");
    when(chatService.getSessionKbId(1001L, user)).thenReturn(0L);
    when(chatService.listMessages(1001L, user))
        .thenReturn(List.of(Map.of("role", "user", "content", "history")));
    when(chatMessageService.findAssistantContent(eq(1001L), eq(1L), anyString())).thenReturn(null);
    when(agentProxyService.proxyChatOnce(any(ChatStreamRequestDTO.class), eq(1L)))
        .thenReturn(new ChatStreamProxyResult("assistant reply"));

    ApiResponseDTO<Map<String, Object>> response = chatController.sendMessage(1001L, body, user);

    assertThat(response.getCode()).isEqualTo(200);
    assertThat(response.getData()).isNotNull();
    assertThat(String.valueOf(response.getData().get("content"))).isEqualTo("assistant reply");

    ArgumentCaptor<ChatStreamRequestDTO> requestCaptor =
        ArgumentCaptor.forClass(ChatStreamRequestDTO.class);
    verify(agentProxyService).proxyChatOnce(requestCaptor.capture(), eq(1L));
    assertThat(requestCaptor.getValue().getKbId()).isEqualTo(0L);

    ArgumentCaptor<String> userContent = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> assistantContent = ArgumentCaptor.forClass(String.class);
    verify(chatMessageService)
        .saveTurn(
            eq(1001L), eq(1L), anyString(), userContent.capture(), assistantContent.capture());
    assertThat(userContent.getValue()).isEqualTo("hello");
    assertThat(assistantContent.getValue()).isEqualTo("assistant reply");
  }

  @Test
  void sendMessage_shouldPersistFailurePlaceholderWhenAgentThrows() throws Exception {
    UserDO user = buildUser();
    Map<String, String> body = Map.of("content", "hello", "kbId", "999");
    when(chatService.getSessionKbId(1001L, user)).thenReturn(0L);
    when(chatService.listMessages(1001L, user))
        .thenReturn(List.of(Map.of("role", "user", "content", "history")));
    when(chatMessageService.findAssistantContent(eq(1001L), eq(1L), anyString())).thenReturn(null);
    when(agentProxyService.proxyChatOnce(any(ChatStreamRequestDTO.class), eq(1L)))
        .thenThrow(new RuntimeException("agent boom"));

    ApiResponseDTO<Map<String, Object>> response = chatController.sendMessage(1001L, body, user);

    assertThat(response.getCode()).isEqualTo(200);
    assertThat(response.getData()).isNotNull();
    assertThat(String.valueOf(response.getData().get("content"))).contains("agent boom");

    ArgumentCaptor<String> assistantContent = ArgumentCaptor.forClass(String.class);
    verify(chatMessageService)
        .saveTurn(eq(1001L), eq(1L), anyString(), eq("hello"), assistantContent.capture());
    assertThat(assistantContent.getValue()).contains("agent boom");
  }

  private UserDO buildUser() {
    UserDO user = new UserDO();
    user.setId(1L);
    return user;
  }
}
