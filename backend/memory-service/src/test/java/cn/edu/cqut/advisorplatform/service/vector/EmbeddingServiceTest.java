package cn.edu.cqut.advisorplatform.service.vector;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class EmbeddingServiceTest {

  @Test
  void toEmbeddingVector_whenFirstEmbeddingMissing_shouldReturnConfiguredZeroVector() {
    EmbeddingService service = new EmbeddingService();
    ReflectionTestUtils.setField(service, "embeddingDimension", 3);

    assertThat(service.toEmbeddingVector(List.of())).containsExactly(0.0, 0.0, 0.0);
    assertThat(service.toEmbeddingVector(Arrays.asList((List<Number>) null)))
        .containsExactly(0.0, 0.0, 0.0);
    assertThat(service.toEmbeddingVector(List.of(List.of()))).containsExactly(0.0, 0.0, 0.0);
  }

  @Test
  void toEmbeddingVector_whenFirstEmbeddingPresent_shouldConvertNumbers() {
    EmbeddingService service = new EmbeddingService();
    ReflectionTestUtils.setField(service, "embeddingDimension", 3);

    double[] result = service.toEmbeddingVector(List.of(List.of(1, 2.5, 3L)));

    assertThat(result).containsExactly(1.0, 2.5, 3.0);
  }
}
