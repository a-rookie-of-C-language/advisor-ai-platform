package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RagKnowledgeBaseDao extends JpaRepository<RagKnowledgeBaseDO, Long> {

    List<RagKnowledgeBaseDO> findByCreatedByIdOrderByCreatedAtDesc(Long userId);

    List<RagKnowledgeBaseDO> findAllByOrderByCreatedAtDesc();
}
