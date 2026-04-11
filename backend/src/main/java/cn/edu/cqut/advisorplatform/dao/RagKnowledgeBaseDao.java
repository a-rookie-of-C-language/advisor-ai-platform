package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RagKnowledgeBaseDao extends JpaRepository<RagKnowledgeBase, Long> {

    List<RagKnowledgeBase> findByCreatedByIdOrderByCreatedAtDesc(Long userId);
}
