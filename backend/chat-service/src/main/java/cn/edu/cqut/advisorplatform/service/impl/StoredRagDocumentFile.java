package cn.edu.cqut.advisorplatform.service.impl;

import java.nio.file.Path;

public class StoredRagDocumentFile {

  private final String safeFilename;
  private final String fileType;
  private final long size;
  private final Path filePath;

  public StoredRagDocumentFile(String safeFilename, String fileType, long size, Path filePath) {
    this.safeFilename = safeFilename;
    this.fileType = fileType;
    this.size = size;
    this.filePath = filePath;
  }

  public String getSafeFilename() {
    return safeFilename;
  }

  public String getFileType() {
    return fileType;
  }

  public long getSize() {
    return size;
  }

  public Path getFilePath() {
    return filePath;
  }
}
