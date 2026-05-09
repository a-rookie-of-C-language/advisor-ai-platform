package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface RagKnowledgeBaseDao {
  List<RagKnowledgeBaseDO> findByCreatedByIdOrderByCreatedAtDesc(@Param("userId") Long userId);

  List<RagKnowledgeBaseDO> findAllByOrderByCreatedAtDesc();

  void insert(RagKnowledgeBaseDO kb);

  void update(RagKnowledgeBaseDO kb);

  void deleteById(@Param("id") Long id);

  Optional<RagKnowledgeBaseDO> findById(@Param("id") Long id);

  boolean existsById(@Param("id") Long id);

  default RagKnowledgeBaseDO save(RagKnowledgeBaseDO kb) {
    if (kb.getId() == null) {
      insert(kb);
    } else {
      update(kb);
    }
    return kb;
  }
}
