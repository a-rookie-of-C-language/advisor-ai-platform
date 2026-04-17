package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.service.ChatService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatControllerStreamPersistenceTest {

    @Mock
    private AgentProxyService agentProxyService;

    @Mock
    private ChatService chatService;

    @Mock
    private ChatMessageService chatMessageService;

    @InjectMocks
    private ChatController chatController;

    @Test
    void streamChat_shouldPersistAssistantOnSuccess() throws Exception {
        ChatStreamRequestDTO request = buildRequest();
        UserDO user = buildUser();
        when(chatService.getSessionKbId(1001L, user)).thenReturn(0L);
        when(agentProxyService.proxyChatStream(any(ChatStreamRequestDTO.class), anyLong(), any(OutputStream.class)))
                .thenReturn(new ChatStreamProxyResult("\u4f60\u597d\uff0c\u6d4b\u8bd5\u56de\u590d"));

        StreamingResponseBody body = chatController.streamChat(request, user).getBody();
        assertThat(body).isNotNull();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        String sse = out.toString(StandardCharsets.UTF_8);
        assertThat(sse).contains("event:done");

        ArgumentCaptor<ChatStreamRequestDTO> reqCaptor = ArgumentCaptor.forClass(ChatStreamRequestDTO.class);
        verify(agentProxyService).proxyChatStream(reqCaptor.capture(), anyLong(), any(OutputStream.class));
        assertThat(reqCaptor.getValue().getKbId()).isEqualTo(0L);

        ArgumentCaptor<String> assistantCaptor = ArgumentCaptor.forClass(String.class);
        verify(chatMessageService).saveTurn(anyLong(), anyLong(), any(String.class), any(String.class), assistantCaptor.capture());
        assertThat(assistantCaptor.getValue()).isEqualTo("\u4f60\u597d\uff0c\u6d4b\u8bd5\u56de\u590d");
    }

    @Test
    void streamChat_shouldPersistErrorPlaceholderOnFailure() throws Exception {
        ChatStreamRequestDTO request = buildRequest();
        UserDO user = buildUser();
        when(chatService.getSessionKbId(1001L, user)).thenReturn(0L);
        doThrow(new RuntimeException("agent boom"))
                .when(agentProxyService)
                .proxyChatStream(any(ChatStreamRequestDTO.class), anyLong(), any(OutputStream.class));

        StreamingResponseBody body = chatController.streamChat(request, user).getBody();
        assertThat(body).isNotNull();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        String sse = out.toString(StandardCharsets.UTF_8);
        assertThat(sse).contains("event:error");
        assertThat(sse).contains("event:done");

        ArgumentCaptor<String> assistantCaptor = ArgumentCaptor.forClass(String.class);
        verify(chatMessageService).saveTurn(anyLong(), anyLong(), any(String.class), any(String.class), assistantCaptor.capture());
        assertThat(assistantCaptor.getValue()).contains("agent boom");
    }

    private ChatStreamRequestDTO buildRequest() {
        ChatStreamMessageDTO user = new ChatStreamMessageDTO();
        user.setRole("user");
        user.setContent("hello");

        ChatStreamRequestDTO request = new ChatStreamRequestDTO();
        request.setSessionId(1001L);
        request.setKbId(999L);
        request.setMessages(List.of(user));
        return request;
    }

    private UserDO buildUser() {
        UserDO user = new UserDO();
        user.setId(1L);
        return user;
    }
}
