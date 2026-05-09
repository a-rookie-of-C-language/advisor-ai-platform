package cn.edu.cqut.advisorplatform.mapper;

import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface RagDocumentMapper {

  void insert(RagDocumentDO document);

  void update(RagDocumentDO document);

  void delete(Long id);

  RagDocumentDO selectById(Long id);

  List<RagDocumentDO> selectByKnowledgeBaseId(@Param("knowledgeBaseId") Long knowledgeBaseId);

  List<RagDocumentDO> selectByKnowledgeBaseIdPageable(
      @Param("knowledgeBaseId") Long knowledgeBaseId,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByKnowledgeBaseId(@Param("knowledgeBaseId") Long knowledgeBaseId);

  List<RagDocumentDO> selectByStatus(@Param("status") String status);

  List<RagDocumentDO> selectByKnowledgeBaseIdAndStatus(
      @Param("knowledgeBaseId") Long knowledgeBaseId,
      @Param("status") String status);

  List<RagDocumentDO> selectByFilenameContaining(@Param("filename") String filename);

  List<RagDocumentDO> selectAll();

  List<RagDocumentDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  Optional<RagDocumentDO> selectByKnowledgeBaseIdAndFilename(
      @Param("knowledgeBaseId") Long knowledgeBaseId,
      @Param("filename") String filename);

  long deleteByKnowledgeBaseId(@Param("knowledgeBaseId") Long knowledgeBaseId);

  List<RagDocumentDO> selectByKnowledgeBaseIdAndStatusPageable(
      @Param("knowledgeBaseId") Long knowledgeBaseId,
      @Param("status") String status,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByKnowledgeBaseIdAndStatus(
      @Param("knowledgeBaseId") Long knowledgeBaseId,
      @Param("status") String status);
}
