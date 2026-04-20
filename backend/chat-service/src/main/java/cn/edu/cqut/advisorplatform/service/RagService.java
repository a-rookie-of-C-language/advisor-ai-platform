package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import org.springframework.lang.Nullable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RagService {

    List<KnowledgeBaseResponseDTO> listKnowledgeBases(@Nullable UserDO currentUser);

    KnowledgeBaseResponseDTO createKnowledgeBase(String name, String description, @Nullable UserDO currentUser);

    void deleteKnowledgeBase(Long id, @Nullable UserDO currentUser);

    List<RagDocumentResponseDTO> listDocuments(Long kbId, @Nullable UserDO currentUser);

    RagDocumentResponseDTO uploadDocument(Long kbId, MultipartFile file, @Nullable UserDO currentUser);

    void deleteDocument(Long id, @Nullable UserDO currentUser);
}
