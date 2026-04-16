package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;

import java.io.IOException;
import java.io.OutputStream;

public interface AgentProxyService {

    void proxyChatStream(ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException;
}
