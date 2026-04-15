package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RagDocumentDao extends JpaRepository<RagDocumentDO, Long> {

    List<RagDocumentDO> findByKnowledgeBaseIdOrderByCreatedAtDesc(Long knowledgeBaseId);

    long countByKnowledgeBaseId(Long knowledgeBaseId);
}
