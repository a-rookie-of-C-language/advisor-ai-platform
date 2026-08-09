package cn.edu.cqut.advisorplatform.service.impl.workspace;

import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dao.chat.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.workspace.WorkspaceFileDao;
import cn.edu.cqut.advisorplatform.dto.response.workspace.WorkspaceFileResponseDTO;
import cn.edu.cqut.advisorplatform.entity.chat.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.user.UserDO;
import cn.edu.cqut.advisorplatform.entity.workspace.WorkspaceFileDO;
import cn.edu.cqut.advisorplatform.service.workspace.WorkspaceFileService;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceFileServiceImpl implements WorkspaceFileService {

  private final WorkspaceFileDao workspaceFileDao;
  private final ChatSessionDao chatSessionDao;
  private final WorkspaceFileSupport workspaceFileSupport;
  private final WorkspaceFileUploadSupport uploadSupport;

  @Override
  @Transactional
  public WorkspaceFileResponseDTO uploadFile(
      Long sessionId, MultipartFile file, @Nullable UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    requireSessionOwner(session, currentUser);

    return toResponseDTO(uploadSupport.upload(session, file, currentUser));
  }

  @Override
  @Transactional(readOnly = true)
  public List<WorkspaceFileResponseDTO> listFiles(Long sessionId, @Nullable UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    requireSessionOwner(session, currentUser);
    return workspaceFileDao.findBySessionIdOrderByCreatedAtDesc(sessionId).stream()
        .map(this::toResponseDTO)
        .toList();
  }

  @Override
  @Transactional
  public void deleteFile(Long fileId, @Nullable UserDO currentUser) {
    WorkspaceFileDO file =
        workspaceFileDao.findById(fileId).orElseThrow(() -> new NotFoundException("文件不存在"));
    workspaceFileSupport.requireFileAccess(file, currentUser);
    Path path = Path.of(file.getFilePath());
    workspaceFileSupport.deleteFileQuietly(path);
    workspaceFileDao.deleteById(fileId);
  }

  @Override
  @Transactional(readOnly = true)
  public String getFilePath(Long fileId, @Nullable UserDO currentUser) {
    WorkspaceFileDO file =
        workspaceFileDao.findById(fileId).orElseThrow(() -> new NotFoundException("文件不存在"));
    workspaceFileSupport.requireFileAccess(file, currentUser);
    return file.getFilePath();
  }

  private void requireSessionOwner(ChatSessionDO session, @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    if (session.getUser() == null
        || session.getUser().getId() == null
        || !session.getUser().getId().equals(currentUser.getId())) {
      throw new ForbiddenException("无权访问该会话");
    }
  }

  private WorkspaceFileResponseDTO toResponseDTO(WorkspaceFileDO entity) {
    return WorkspaceFileResponseDTO.builder()
        .id(entity.getId())
        .fileName(entity.getFileName())
        .fileType(entity.getFileType())
        .fileSize(entity.getFileSize())
        .createdAt(entity.getCreatedAt())
        .build();
  }
}
