package cn.edu.cqut.advisorplatform.service.impl.workspace;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;

class WorkspaceFileSupportTest {

  @Test
  void validateImageMagic_shouldReturnFalseWhenHeaderIsTooShort() throws Exception {
    WorkspaceFileSupport support = new WorkspaceFileSupport();

    boolean result = support.validateImageMagic(new ByteArrayInputStream(new byte[] {0x01, 0x02}));

    assertThat(result).isFalse();
  }
}
