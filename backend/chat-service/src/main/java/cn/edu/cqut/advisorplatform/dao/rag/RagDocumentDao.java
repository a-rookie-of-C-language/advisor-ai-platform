package cn.edu.cqut.advisorplatform.dao.rag;

import cn.edu.cqut.advisorplatform.entity.rag.RagDocumentDO;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RagDocumentDao extends JpaRepository<RagDocumentDO, Long> {

  List<RagDocumentDO> findByKnowledgeBaseIdOrderByCreatedAtDesc(Long knowledgeBaseId);

  long countByKnowledgeBaseId(Long knowledgeBaseId);
}
