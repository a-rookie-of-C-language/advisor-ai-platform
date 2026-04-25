package cn.edu.cqut.advisorplatform.client;

import cn.edu.cqut.advisorplatform.config.feign.InternalTokenFeignConfig;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import java.util.Map;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "rag-service", configuration = InternalTokenFeignConfig.class)
public interface RagServiceClient {

  @GetMapping("/internal/rag/knowledge-bases/{id}/exists")
  ApiResponseDTO<Map<String, Boolean>> existsKnowledgeBase(@PathVariable("id") Long id);
}
