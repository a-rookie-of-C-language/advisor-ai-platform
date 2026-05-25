package cn.edu.cqut.advisorplatform.aspect;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AuditValueSanitizerTest {

  private final AuditValueSanitizer sanitizer = new AuditValueSanitizer();

  @Test
  void sanitizeValue_shouldMaskSensitiveKeysInsideNestedMap() {
    Object result =
        sanitizer.sanitizeValue(
            "body",
            Map.of(
                "username", "alice",
                "password", "123456",
                "profile", Map.of("apiKey", "secret-key", "age", 18)));

    assertThat(result)
        .isEqualTo(
            Map.of(
                "username", "alice",
                "password", "***",
                "profile", Map.of("apiKey", "***", "age", "18")));
  }

  @Test
  void sanitizeValue_shouldLimitListItems() {
    List<Integer> values = java.util.stream.IntStream.range(0, 25).boxed().toList();

    Object result = sanitizer.sanitizeValue("items", values);

    assertThat((List<?>) result).hasSize(20);
  }

  @Test
  void sanitizeValue_shouldReplaceBinaryData() {
    assertThat(sanitizer.sanitizeValue("file", new byte[] {1, 2, 3})).isEqualTo("[binary data]");
  }

  @Test
  void truncate_shouldLimitLongText() {
    String longText = "a".repeat(1001);

    assertThat(sanitizer.truncate(longText)).hasSize(1014).endsWith("...[truncated]");
  }
}
