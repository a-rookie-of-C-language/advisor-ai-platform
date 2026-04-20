package cn.edu.cqut.advisorplatform.service.vector;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmbeddingService {

    private final RestClient restClient;

    @Value("${advisor.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${advisor.embedding.model:bge-m3}")
    private String embeddingModel;

    @Value("${advisor.embedding.dimension:1024}")
    private int embeddingDimension;

    public EmbeddingService() {
        this.restClient = RestClient.create();
    }

    public double[] embed(String content) {
        if (content == null || content.isBlank()) {
            return new double[embeddingDimension];
        }

        try {
            Map<String, Object> requestBody = Map.of(
                "model", embeddingModel,
                "input", content
            );

            Map<String, Object> response = restClient.post()
                .uri(ollamaBaseUrl + "/api/embed")
                .body(requestBody)
                .retrieve()
                .body(Map.class);

            if (response != null && response.containsKey("embeddings")) {
                @SuppressWarnings("unchecked")
                List<List<Number>> embeddings = (List<List<Number>>) response.get("embeddings");
                if (embeddings == null || embeddings.isEmpty()) {
                    return new double[embeddingDimension];
                }
                List<Number> embeddingList = embeddings.get(0);
                return embeddingList.stream()
                    .mapToDouble(Number::doubleValue)
                    .toArray();
            }

            log.warn("Ollama embedding 返回格式异常: {}", response);
            return new double[embeddingDimension];

        } catch (Exception e) {
            log.error("生成 embedding 失败: {}, content长度: {}", e.getMessage(), content.length());
            return new double[embeddingDimension];
        }
    }

    public int getDimension() {
        return embeddingDimension;
    }
}
