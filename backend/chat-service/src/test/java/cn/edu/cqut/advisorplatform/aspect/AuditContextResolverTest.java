package cn.edu.cqut.advisorplatform.aspect;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class AuditContextResolverTest {

  @Mock private ProceedingJoinPoint joinPoint;

  @Mock private MethodSignature signature;

  private final AuditContextResolver resolver = new AuditContextResolver();

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    LogTraceUtil.clear();
  }

  @Test
  void getCurrentUser_shouldAdaptUserDoPrincipal() {
    UserDO user = new UserDO();
    user.setId(7L);
    user.setUsername("advisor");
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(user, null));

    assertThat(resolver.getCurrentUser()).isNotNull();
    assertThat(resolver.getCurrentUser().getId()).isEqualTo(7L);
    assertThat(resolver.getCurrentUser().getUsername()).isEqualTo("advisor");
  }

  @Test
  void getClientIp_shouldUseFirstForwardedIp() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("X-Forwarded-For", "10.0.0.1, 10.0.0.2");

    assertThat(resolver.getClientIp(request)).isEqualTo("10.0.0.1");
  }

  @Test
  void resolveTraceId_shouldPreferMdcThenAttributeThenHeader() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("X-Trace-Id", "trace-header");
    request.setAttribute("auditTraceId", "trace-attr");

    assertThat(resolver.resolveTraceId(request)).isEqualTo("trace-attr");

    LogTraceUtil.put("trace-mdc", null, null, null);

    assertThat(resolver.resolveTraceId(request)).isEqualTo("trace-mdc");
  }

  @Test
  void resolveSessionId_shouldUseRequestAttributeBeforeMethodArguments() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRequestURI("/api/chat/sessions/1001/messages");
    request.setAttribute("auditSessionId", 2002L);

    assertThat(resolver.resolveSessionId(joinPoint, signature, request)).isEqualTo(2002L);
  }

  @Test
  void resolveSessionId_shouldFallbackToSessionPathIdArgument() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRequestURI("/api/chat/sessions/1001/messages");
    when(joinPoint.getArgs()).thenReturn(new Object[] {1001L});
    when(signature.getParameterNames()).thenReturn(new String[] {"id"});

    assertThat(resolver.resolveSessionId(joinPoint, signature, request)).isEqualTo(1001L);
  }
}
