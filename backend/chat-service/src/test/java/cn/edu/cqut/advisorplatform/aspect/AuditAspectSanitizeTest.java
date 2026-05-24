package cn.edu.cqut.advisorplatform.aspect;

<<<<<<< HEAD
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

=======
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AuditService;
<<<<<<< HEAD
import java.util.Map;
=======
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

<<<<<<< HEAD
@ExtendWith(MockitoExtension.class)
class AuditAspectSanitizeTest {

  @Mock private AuditService auditService;

  @Mock private ProceedingJoinPoint joinPoint;

  @Mock private MethodSignature methodSignature;

  @InjectMocks private AuditAspect auditAspect;

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    RequestContextHolder.resetRequestAttributes();
  }

  @Test
  void audit_shouldMaskSensitiveValuesInRequestParams() throws Throwable {
    UserDO user = new UserDO();
    user.setId(1L);
    user.setUsername("admin");
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));

    Map<String, Object> body =
        Map.of(
            "username", "alice",
            "password", "123456",
            "token", "abc-token",
            "apiKey", "my-api-key",
            "refreshToken", "my-refresh-token");
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRequestURI("/api/auth/register");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    when(joinPoint.getSignature()).thenReturn(methodSignature);
    when(methodSignature.getMethod()).thenReturn(TestController.class.getMethod("save", Map.class));
    when(joinPoint.getArgs()).thenReturn(new Object[] {body});
    when(joinPoint.proceed()).thenReturn("ok");

    auditAspect.audit(joinPoint);

    ArgumentCaptor<AuditLogDO> captor = ArgumentCaptor.forClass(AuditLogDO.class);
    verify(auditService).saveAuditLogAsync(captor.capture());

    String requestParams = captor.getValue().getRequestParams();
    assertThat(requestParams).contains("\"username\":\"alice\"");
    assertThat(requestParams).contains("\"password\":\"***\"");
    assertThat(requestParams).contains("\"token\":\"***\"");
    assertThat(requestParams).contains("\"apiKey\":\"***\"");
    assertThat(requestParams).contains("\"refreshToken\":\"***\"");
    assertThat(requestParams)
        .doesNotContain("123456")
        .doesNotContain("abc-token")
        .doesNotContain("my-api-key")
        .doesNotContain("my-refresh-token");
  }

  static class TestController {

    @Auditable(
        module = AuditLogDO.AuditModule.AUTH,
        action = AuditLogDO.AuditAction.STORE,
        logRequestParams = true)
    public String save(Map<String, Object> body) {
      return "ok";
    }
  }
=======
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditAspectSanitizeTest {

    @Mock
    private AuditService auditService;

    @Mock
    private ProceedingJoinPoint joinPoint;

    @Mock
    private MethodSignature methodSignature;

    @InjectMocks
    private AuditAspect auditAspect;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void audit_shouldMaskSensitiveValuesInRequestParams() throws Throwable {
        UserDO user = new UserDO();
        user.setId(1L);
        user.setUsername("admin");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );

        Map<String, Object> body = Map.of(
                "username", "alice",
                "password", "123456",
                "token", "abc-token",
                "apiKey", "my-api-key",
                "refreshToken", "my-refresh-token"
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/register");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        when(joinPoint.getSignature()).thenReturn(methodSignature);
        when(methodSignature.getMethod()).thenReturn(TestController.class.getMethod("save", Map.class));
        when(joinPoint.getArgs()).thenReturn(new Object[]{body});
        when(joinPoint.proceed()).thenReturn("ok");

        auditAspect.audit(joinPoint);

        ArgumentCaptor<AuditLogDO> captor = ArgumentCaptor.forClass(AuditLogDO.class);
        verify(auditService).saveAuditLogAsync(captor.capture());

        String requestParams = captor.getValue().getRequestParams();
        assertThat(requestParams).contains("\"username\":\"alice\"");
        assertThat(requestParams).contains("\"password\":\"***\"");
        assertThat(requestParams).contains("\"token\":\"***\"");
        assertThat(requestParams).contains("\"apiKey\":\"***\"");
        assertThat(requestParams).contains("\"refreshToken\":\"***\"");
        assertThat(requestParams)
                .doesNotContain("123456")
                .doesNotContain("abc-token")
                .doesNotContain("my-api-key")
                .doesNotContain("my-refresh-token");
    }

    static class TestController {

        @Auditable(module = AuditLogDO.AuditModule.AUTH, action = AuditLogDO.AuditAction.STORE, logRequestParams = true)
        public String save(Map<String, Object> body) {
            return "ok";
        }
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
