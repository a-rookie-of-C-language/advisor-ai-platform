package cn.edu.cqut.advisorplatform.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class ChatRequestAuditContextTest {

  private final ChatRequestAuditContext auditContext = new ChatRequestAuditContext();

  @AfterEach
  void tearDown() {
    RequestContextHolder.resetRequestAttributes();
  }

  @Test
  void resolveTraceIdFromRequest_shouldUseTraceHeader() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("X-Trace-Id", "trace-001");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    assertThat(auditContext.resolveTraceIdFromRequest()).isEqualTo("trace-001");
  }

  @Test
  void attach_shouldSetAuditAttributesWhenValuesPresent() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    auditContext.attach("trace-001", 1001L, "turn-001");

    assertThat(request.getAttribute("auditTraceId")).isEqualTo("trace-001");
    assertThat(request.getAttribute("auditSessionId")).isEqualTo(1001L);
    assertThat(request.getAttribute("auditTurnId")).isEqualTo("turn-001");
  }
}
