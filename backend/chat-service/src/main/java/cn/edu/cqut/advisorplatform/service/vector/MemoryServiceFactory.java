package cn.edu.cqut.advisorplatform.service.vector;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class MemoryServiceFactory {

  private final Map<String, MemoryVectorService> services;

  public MemoryServiceFactory(List<MemoryVectorService> services) {
    this.services =
        services.stream()
            .collect(Collectors.toMap(MemoryVectorService::storeType, Function.identity()));
    services.forEach(s -> log.info("Registered MemoryVectorService: {}", s.storeType()));
  }

  public MemoryVectorService getService() {
    return services.values().stream()
        .findFirst()
        .orElseThrow(
            () -> new IllegalStateException("No MemoryVectorService implementation found"));
  }

  public MemoryVectorService getService(String type) {
    MemoryVectorService service = services.get(type.trim().toLowerCase());
    if (service == null) {
      throw new IllegalArgumentException("Unknown vector store type: " + type);
    }
    return service;
  }

  public boolean hasService(String type) {
    return services.containsKey(type.trim().toLowerCase());
  }
}
