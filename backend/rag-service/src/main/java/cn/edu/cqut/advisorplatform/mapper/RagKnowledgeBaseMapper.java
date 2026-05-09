package cn.edu.cqut.advisorplatform.mapper;

import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface RagKnowledgeBaseMapper {

  void insert(RagKnowledgeBaseDO knowledgeBase);

  void update(RagKnowledgeBaseDO knowledgeBase);

  void delete(Long id);

  RagKnowledgeBaseDO selectById(Long id);

  List<RagKnowledgeBaseDO> selectByCreatedById(@Param("createdById") Long createdById);

  List<RagKnowledgeBaseDO> selectByCreatedByIdAndNotDeleted(
      @Param("createdById") Long createdById);

  List<RagKnowledgeBaseDO> selectByCreatedByIdPageable(
      @Param("createdById") Long createdById,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByCreatedById(@Param("createdById") Long createdById);

  int countByCreatedByIdAndNotDeleted(@Param("createdById") Long createdById);

  List<RagKnowledgeBaseDO> selectByNameContaining(@Param("name") String name);

  List<RagKnowledgeBaseDO> selectAll();

  List<RagKnowledgeBaseDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  void markDeleted(@Param("id") Long id);

  Optional<RagKnowledgeBaseDO> selectByName(@Param("name") String name);
}
