package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface RagDocumentDao {
  List<RagDocumentDO> findByKnowledgeBaseIdOrderByCreatedAtDesc(
      @Param("knowledgeBaseId") Long knowledgeBaseId);

  long countByKnowledgeBaseId(@Param("knowledgeBaseId") Long knowledgeBaseId);

  void insert(RagDocumentDO doc);

  void update(RagDocumentDO doc);

  void deleteById(@Param("id") Long id);

  Optional<RagDocumentDO> findById(@Param("id") Long id);

  default RagDocumentDO save(RagDocumentDO doc) {
    if (doc.getId() == null) {
      insert(doc);
    } else {
      update(doc);
    }
    return doc;
  }
}
