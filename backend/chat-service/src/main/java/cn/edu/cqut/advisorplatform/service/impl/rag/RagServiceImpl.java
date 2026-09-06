package cn.edu.cqut.advisorplatform.service.impl.rag;

import cn.edu.cqut.advisorplatform.dao.rag.RagDocumentDao;
import cn.edu.cqut.advisorplatform.dao.rag.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.dto.response.rag.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.rag.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.rag.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.user.UserDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.rag.RagService;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class RagServiceImpl implements RagService {

  private final RagKnowledgeBaseDao knowledgeBaseDao;
  private final RagDocumentDao documentDao;
  private final RagFileSupport ragFileSupport;
  private final RagDocumentMutationSupport documentMutationSupport;
  private final RagEntityFactory entityFactory = new RagEntityFactory();

  @Override
  public List<KnowledgeBaseResponseDTO> listKnowledgeBases(@Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    return knowledgeBaseDao.findAllByOrderByCreatedAtDesc().stream()
        .map(KnowledgeBaseResponseDTO::from)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public KnowledgeBaseResponseDTO createKnowledgeBase(
      String name, String description, @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    LocalDateTime now = LocalDateTime.now();
    RagKnowledgeBaseDO kb = entityFactory.createKnowledgeBase(name, description, currentUser, now);
    return KnowledgeBaseResponseDTO.from(knowledgeBaseDao.save(kb));
  }

  @Override
  @Transactional
  public void deleteKnowledgeBase(Long id, @Nullable UserDO currentUser) {
    RagKnowledgeBaseDO kb =
        knowledgeBaseDao.findById(id).orElseThrow(() -> new NotFoundException("知识库不存在"));
    if (!ragFileSupport.isKnowledgeBaseOwner(kb, currentUser)) {
      throw new ForbiddenException("无权限访问该知识库");
    }
    Path kbDir = ragFileSupport.resolveKnowledgeBaseDir(id);
    ragFileSupport.deleteDirectoryQuietly(kbDir);
    knowledgeBaseDao.deleteById(id);
  }

  @Override
  public List<RagDocumentResponseDTO> listDocuments(Long knowledgeBaseId, UserDO currentUser) {
    knowledgeBaseDao.findById(knowledgeBaseId).orElseThrow(() -> new NotFoundException("知识库不存在"));
    return documentDao.findByKnowledgeBaseIdOrderByCreatedAtDesc(knowledgeBaseId).stream()
        .map(RagDocumentResponseDTO::from)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public RagDocumentResponseDTO uploadDocument(
      Long knowledgeBaseId, MultipartFile file, @Nullable UserDO currentUser) {
    return documentMutationSupport.uploadDocument(knowledgeBaseId, file, currentUser);
  }

  @Override
  @Transactional
  public void deleteDocument(Long id, @Nullable UserDO currentUser) {
    documentMutationSupport.deleteDocument(id, currentUser);
  }
}
