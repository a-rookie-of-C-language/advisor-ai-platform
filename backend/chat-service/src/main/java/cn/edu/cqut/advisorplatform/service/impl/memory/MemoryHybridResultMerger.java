package cn.edu.cqut.advisorplatform.service.impl.memory;

import cn.edu.cqut.advisorplatform.entity.memory.UserMemoryDO;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

class MemoryHybridResultMerger {

  List<UserMemoryDO> merge(
      List<UserMemoryDO> vectorResults,
      List<UserMemoryDO> textResults,
      int topK,
      double hybridVectorWeight,
      double hybridTextWeight) {
    Map<Long, Double> vectorScores = buildRankScores(vectorResults);
    Map<Long, Double> textScores = buildRankScores(textResults);

    Set<Long> allIds = new LinkedHashSet<>();
    vectorResults.forEach(item -> allIds.add(item.getId()));
    textResults.forEach(item -> allIds.add(item.getId()));

    Map<Long, UserMemoryDO> allItemsMap = new LinkedHashMap<>();
    for (UserMemoryDO item : vectorResults) {
      allItemsMap.putIfAbsent(item.getId(), item);
    }
    for (UserMemoryDO item : textResults) {
      allItemsMap.putIfAbsent(item.getId(), item);
    }

    List<Map.Entry<Long, Double>> fused =
        allIds.stream()
            .map(
                id -> {
                  double vScore = vectorScores.getOrDefault(id, 0.0);
                  double tScore = textScores.getOrDefault(id, 0.0);
                  double fusedScore = hybridVectorWeight * vScore + hybridTextWeight * tScore;
                  return Map.entry(id, fusedScore);
                })
            .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
            .limit(topK)
            .toList();

    return fused.stream()
        .map(entry -> allItemsMap.get(entry.getKey()))
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
  }

  private Map<Long, Double> buildRankScores(List<UserMemoryDO> results) {
    Map<Long, Double> scores = new LinkedHashMap<>();
    for (int i = 0; i < results.size(); i++) {
      UserMemoryDO item = results.get(i);
      double rankScore = 1.0 - ((double) i / Math.max(results.size(), 1));
      scores.merge(item.getId(), rankScore, Math::max);
    }
    return scores;
  }
}
