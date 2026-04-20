package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;

import java.io.IOException;
import java.io.OutputStream;

public interface AgentProxyService {

    ChatStreamProxyResult proxyChatStream(ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException;

    ChatStreamProxyResult proxyChatOnce(ChatStreamRequestDTO request, Long userId) throws IOException;
}
