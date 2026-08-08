package cn.edu.cqut.advisorplatform.service.impl.workspace;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.WorkspaceFileDao;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.WorkspaceFileDO;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceFileServiceImplTest {

  @Mock private WorkspaceFileDao workspaceFileDao;

  @Mock private ChatSessionDao chatSessionDao;

  private WorkspaceFileServiceImpl workspaceFileService;

  @BeforeEach
  void setUp() {
    WorkspaceFileSupport support = new WorkspaceFileSupport();
    workspaceFileService =
        new WorkspaceFileServiceImpl(
            workspaceFileDao,
            chatSessionDao,
            support,
            new WorkspaceFileUploadSupport(workspaceFileDao, support));
  }

  @Test
  void deleteFile_shouldRejectForeignUser() {
    WorkspaceFileDO file = buildFile(1L, 2L, 3L);
    when(workspaceFileDao.findById(10L)).thenReturn(Optional.of(file));

    assertThatThrownBy(() -> workspaceFileService.deleteFile(10L, buildUser(99L)))
        .isInstanceOf(ForbiddenException.class);

    verify(workspaceFileDao, never()).deleteById(10L);
  }

  @Test
  void getFilePath_shouldRejectForeignUser() {
    WorkspaceFileDO file = buildFile(1L, 2L, 3L);
    when(workspaceFileDao.findById(11L)).thenReturn(Optional.of(file));

    assertThatThrownBy(() -> workspaceFileService.getFilePath(11L, buildUser(99L)))
        .isInstanceOf(ForbiddenException.class);
  }

  private WorkspaceFileDO buildFile(Long fileId, Long sessionUserId, Long uploadedById) {
    WorkspaceFileDO file = new WorkspaceFileDO();
    file.setId(fileId);
    file.setFilePath("/tmp/workspace/" + fileId);
    file.setSession(buildSession(sessionUserId));
    file.setUploadedBy(buildUser(uploadedById));
    return file;
  }

  private ChatSessionDO buildSession(Long userId) {
    ChatSessionDO session = new ChatSessionDO();
    session.setId(1L);
    session.setUser(buildUser(userId));
    return session;
  }

  private UserDO buildUser(Long userId) {
    UserDO user = new UserDO();
    user.setId(userId);
    return user;
  }
}
