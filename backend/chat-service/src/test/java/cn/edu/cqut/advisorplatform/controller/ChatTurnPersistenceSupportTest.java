package cn.edu.cqut.advisorplatform.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatTurnPersistenceSupportTest {

  @Mock private ChatMessageService chatMessageService;

  private final ChatTurnPersistenceSupport support = new ChatTurnPersistenceSupport();

  @Test
  void saveTurn_shouldUseSimpleSaveWhenNoSourcesOrEvents() {
    support.saveTurn(chatMessageService, 1001L, 1L, "turn", "hello", "answer", List.of(), null);

    verify(chatMessageService).saveTurn(1001L, 1L, "turn", "hello", "answer");
  }

  @Test
  void saveTurn_shouldUseMetadataSaveWhenSourcesPresent() {
    SourceReference source = new SourceReference();
    List<SourceReference> sources = List.of(source);

    support.saveTurn(chatMessageService, 1001L, 1L, "turn", "hello", "answer", sources, List.of());

    verify(chatMessageService)
        .saveTurn(
            eq(1001L), eq(1L), eq("turn"), eq("hello"), eq("answer"), eq(sources), eq(List.of()));
  }

  @Test
  void saveTurnQuietly_shouldSwallowPersistenceFailure() {
    doThrow(new RuntimeException("db down"))
        .when(chatMessageService)
        .saveTurn(eq(1001L), eq(1L), eq("turn"), anyString(), anyString());

    support.saveTurnQuietly(
        chatMessageService, 1001L, 1L, "turn", "hello", "answer", List.of(), List.of());

    verify(chatMessageService).saveTurn(1001L, 1L, "turn", "hello", "answer");
  }
}
