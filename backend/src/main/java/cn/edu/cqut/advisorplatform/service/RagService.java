package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RagService {

    List<KnowledgeBaseResponseDTO> listKnowledgeBases(UserDO currentUser);

    KnowledgeBaseResponseDTO createKnowledgeBase(String name, String description, UserDO currentUser);

    void deleteKnowledgeBase(Long id, UserDO currentUser);

    List<RagDocumentResponseDTO> listDocuments(Long kbId, UserDO currentUser);

    RagDocumentResponseDTO uploadDocument(Long kbId, MultipartFile file, UserDO currentUser);

    void deleteDocument(Long id, UserDO currentUser);
}
