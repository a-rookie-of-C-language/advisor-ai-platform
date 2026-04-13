package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponse;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponse;
import cn.edu.cqut.advisorplatform.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RagService {

    List<KnowledgeBaseResponse> listKnowledgeBases(User currentUser);

    KnowledgeBaseResponse createKnowledgeBase(String name, String description, User currentUser);

    void deleteKnowledgeBase(Long id, User currentUser);

    List<RagDocumentResponse> listDocuments(Long kbId, User currentUser);

    RagDocumentResponse uploadDocument(Long kbId, MultipartFile file, User currentUser);

    void deleteDocument(Long id, User currentUser);
}
