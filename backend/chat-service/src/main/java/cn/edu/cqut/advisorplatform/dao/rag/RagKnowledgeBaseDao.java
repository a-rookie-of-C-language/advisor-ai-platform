package cn.edu.cqut.advisorplatform.dao.rag;

import cn.edu.cqut.advisorplatform.entity.rag.RagKnowledgeBaseDO;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RagKnowledgeBaseDao extends JpaRepository<RagKnowledgeBaseDO, Long> {

  List<RagKnowledgeBaseDO> findByCreatedByIdOrderByCreatedAtDesc(Long userId);

  List<RagKnowledgeBaseDO> findAllByOrderByCreatedAtDesc();
}
