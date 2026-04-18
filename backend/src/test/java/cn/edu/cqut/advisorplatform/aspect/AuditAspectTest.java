package cn.edu.cqut.advisorplatform.aspect;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AuditService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditAspectTest {

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
    }

    @Test
    void audit_shouldIncludeRequiredMethodFieldWhenSavingAuditLog() throws Throwable {
        UserDO user = new UserDO();
        user.setId(1L);
        user.setUsername("tester");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );

        when(joinPoint.getSignature()).thenReturn(methodSignature);
        when(methodSignature.getMethod()).thenReturn(TestController.class.getMethod("search", String.class));
        when(joinPoint.proceed()).thenReturn("ok");

        auditAspect.audit(joinPoint);

        ArgumentCaptor<AuditLogDO> captor = ArgumentCaptor.forClass(AuditLogDO.class);
        verify(auditService).saveAuditLogAsync(captor.capture());

        AuditLogDO saved = captor.getValue();
        assertThat(saved.getModule()).isEqualTo(AuditLogDO.AuditModule.MEMORY);
        assertThat(saved.getAction()).isEqualTo(AuditLogDO.AuditAction.SEARCH);
        assertThat(saved.getResponseStatus()).isEqualTo("SUCCESS");
        assertThat(saved.getMethod()).isNotBlank();
    }

    @Test
    void audit_shouldSaveFailedStatusAndErrorMessageWhenBusinessThrows() throws Throwable {
        UserDO user = new UserDO();
        user.setId(2L);
        user.setUsername("tester2");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );

        when(joinPoint.getSignature()).thenReturn(methodSignature);
        when(methodSignature.getMethod()).thenReturn(TestController.class.getMethod("failingSearch", String.class));
        when(joinPoint.proceed()).thenThrow(new IllegalStateException("boom"));

        assertThatThrownBy(() -> auditAspect.audit(joinPoint))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("boom");

        ArgumentCaptor<AuditLogDO> captor = ArgumentCaptor.forClass(AuditLogDO.class);
        verify(auditService).saveAuditLogAsync(captor.capture());

        AuditLogDO saved = captor.getValue();
        assertThat(saved.getResponseStatus()).isEqualTo("FAILED");
        assertThat(saved.getErrorMessage()).contains("IllegalStateException").contains("boom");
        assertThat(saved.getMethod()).isEqualTo("TestController.failingSearch");
    }

    static class TestController {

        @Auditable(module = AuditLogDO.AuditModule.MEMORY, action = AuditLogDO.AuditAction.SEARCH, logRequestParams = false)
        public String search(String keyword) {
            return keyword;
        }

        @Auditable(module = AuditLogDO.AuditModule.MEMORY, action = AuditLogDO.AuditAction.SEARCH, logRequestParams = false)
        public String failingSearch(String keyword) {
            return keyword;
        }
    }
}
