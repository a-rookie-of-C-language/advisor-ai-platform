package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
import cn.edu.cqut.advisorplatform.service.vector.EmbeddingService;
import cn.edu.cqut.advisorplatform.service.vector.MemoryServiceFactory;
import cn.edu.cqut.advisorplatform.service.vector.MemoryVectorService;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemorySearchSupport {

  private final UserMemoryDao userMemoryDao;
  private final MemoryServiceFactory memoryServiceFactory;
  private final EmbeddingService embeddingService;
  private final MemoryHybridResultMerger hybridResultMerger = new MemoryHybridResultMerger();

  public List<UserMemoryDO> search(
      MemorySearchRequestDTO request,
      int topK,
      String query,
      String mode,
      String vectorStore,
      double hybridVectorWeight,
      double hybridTextWeight) {
    boolean hasVectorService = !query.isEmpty() && memoryServiceFactory.hasService(vectorStore);

    if ("vector".equals(mode) && hasVectorService) {
      return searchByVector(request, vectorStore, topK);
    }
    if ("text".equals(mode)) {
      return searchText(request, query, topK);
    }
    if (hasVectorService) {
      return searchHybrid(request, query, vectorStore, topK, hybridVectorWeight, hybridTextWeight);
    }
    return searchText(request, query, topK);
  }

  public void recordAccessHits(List<UserMemoryDO> rows) {
    if (rows.isEmpty()) {
      return;
    }
    List<Long> ids = rows.stream().map(UserMemoryDO::getId).toList();
    for (Long id : ids) {
      userMemoryDao.incrementAccessCount(id);
    }
  }

  private List<UserMemoryDO> searchByVector(
      MemorySearchRequestDTO request, String vectorStore, int topK) {
    try {
      MemoryVectorService vectorService = memoryServiceFactory.getService(vectorStore);
      double[] queryEmbedding = embeddingService.embed(request.getQuery());
      return vectorService.search(request.getUserId(), request.getKbId(), queryEmbedding, topK);
    } catch (Exception exc) {
      log.warn(
          "memory_vector_search_failed userId={}, kbId={}, err={}",
          request.getUserId(),
          request.getKbId(),
          exc.getMessage());
      return searchText(request, request.getQuery(), topK);
    }
  }

  private List<UserMemoryDO> searchText(MemorySearchRequestDTO request, String query, int topK) {
    return userMemoryDao.searchByScope(
        request.getUserId(),
        request.getKbId(),
        query,
        LocalDateTime.now(),
        PageRequest.of(0, topK));
  }

  private List<UserMemoryDO> searchHybrid(
      MemorySearchRequestDTO request,
      String query,
      String vectorStore,
      int topK,
      double hybridVectorWeight,
      double hybridTextWeight) {
    int recallK = Math.min(topK * 3, 50);

    List<UserMemoryDO> vectorResults;
    try {
      MemoryVectorService vectorService = memoryServiceFactory.getService(vectorStore);
      double[] queryEmbedding = embeddingService.embed(query);
      vectorResults =
          vectorService.search(request.getUserId(), request.getKbId(), queryEmbedding, recallK);
    } catch (Exception exc) {
      log.warn(
          "memory_hybrid_vector_fallback userId={}, kbId={}",
          request.getUserId(),
          request.getKbId());
      return searchText(request, query, topK);
    }

    List<UserMemoryDO> textResults =
        userMemoryDao.searchByScope(
            request.getUserId(),
            request.getKbId(),
            query,
            LocalDateTime.now(),
            PageRequest.of(0, recallK));

    return hybridResultMerger.merge(
        vectorResults, textResults, topK, hybridVectorWeight, hybridTextWeight);
  }
}
