package cn.edu.cqut.advisorplatform.service.storage;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AuditStorageFactory {

  private final Map<String, AuditLogStorage> storages;
  private final AuditLogStorage defaultStorage;

  public AuditStorageFactory(List<AuditLogStorage> storageList) {
    this.storages =
        storageList.stream()
            .collect(Collectors.toMap(AuditLogStorage::storeType, Function.identity()));
    storageList.forEach(s -> log.info("Registered AuditLogStorage: {}", s.storeType()));

    this.defaultStorage =
        storages.values().stream()
            .findFirst()
            .orElseThrow(
                () -> new IllegalStateException("No AuditLogStorage implementation found"));
  }

  public AuditLogStorage getStorage() {
    return defaultStorage;
  }

  public AuditLogStorage getStorage(String type) {
    AuditLogStorage storage = storages.get(type.trim().toLowerCase());
    if (storage == null) {
      throw new IllegalArgumentException("Unknown audit log storage type: " + type);
    }
    return storage;
  }

  public boolean hasStorage(String type) {
    return storages.containsKey(type.trim().toLowerCase());
  }
}
