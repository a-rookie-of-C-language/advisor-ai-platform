package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.WorkspaceFileResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import java.util.List;
import org.springframework.lang.Nullable;
import org.springframework.web.multipart.MultipartFile;

public interface WorkspaceFileService {

  WorkspaceFileResponseDTO uploadFile(
      Long sessionId, MultipartFile file, @Nullable UserDO currentUser);

  List<WorkspaceFileResponseDTO> listFiles(Long sessionId);

  void deleteFile(Long fileId, @Nullable UserDO currentUser);

  String getFilePath(Long fileId);
}
