package cn.edu.cqut.advisorplatform.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import cn.edu.cqut.advisorplatform.service.RagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class RagInternalControllerTest {

  @Mock private RagService ragService;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    RagInternalController controller = new RagInternalController(ragService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void existsKnowledgeBase_shouldReturnBooleanPayload() throws Exception {
    when(ragService.existsKnowledgeBase(100L)).thenReturn(true);

    mockMvc
        .perform(get("/internal/rag/knowledge-bases/100/exists"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").value(200))
        .andExpect(jsonPath("$.data.exists").value(true));
  }
}
