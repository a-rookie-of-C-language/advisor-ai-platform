package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.WorkspaceFileDO;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceFileDao extends JpaRepository<WorkspaceFileDO, Long> {

  List<WorkspaceFileDO> findBySessionIdOrderByCreatedAtDesc(Long sessionId);

  List<WorkspaceFileDO> findByIdIn(List<Long> ids);
}
