package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dao.RagDocumentDao;
import cn.edu.cqut.advisorplatform.dao.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RagServiceImplTest {

  @Mock private RagKnowledgeBaseDao knowledgeBaseDao;

  @Mock private RagDocumentDao documentDao;

  @InjectMocks private RagServiceImpl ragService;

  @Test
  void createKnowledgeBase_shouldPersistReadyStatus() {
    UserPrincipal user = new UserPrincipal(1L, "tester", "ADVISOR");

    RagKnowledgeBaseDO saved = new RagKnowledgeBaseDO();
    saved.setId(10L);
    saved.setName("kb");
    saved.setStatus(RagKnowledgeBaseDO.KnowledgeBaseStatus.READY);
    when(knowledgeBaseDao.save(any(RagKnowledgeBaseDO.class))).thenReturn(saved);

    KnowledgeBaseResponseDTO response = ragService.createKnowledgeBase("kb", "desc", user);

    assertThat(response.getId()).isEqualTo(10L);
    assertThat(response.getStatus()).isEqualTo("READY");

    ArgumentCaptor<RagKnowledgeBaseDO> captor = ArgumentCaptor.forClass(RagKnowledgeBaseDO.class);
    verify(knowledgeBaseDao).save(captor.capture());
    assertThat(captor.getValue().getCreatedBy().getId()).isEqualTo(1L);
  }

  @Test
  void deleteDocument_shouldUpdateDocCountAndDeleteRecord() {
    ReflectionTestUtils.setField(ragService, "uploadDir", "uploads");

    UserPrincipal user = new UserPrincipal(2L, "tester", "ADVISOR");

    RagKnowledgeBaseDO kb = new RagKnowledgeBaseDO();
    kb.setId(20L);
    kb.setDocCount(3);
    UserDO owner = new UserDO();
    owner.setId(2L);
    kb.setCreatedBy(owner);

    RagDocumentDO doc = new RagDocumentDO();
    doc.setId(30L);
    doc.setKnowledgeBase(kb);
    UserDO owner = new UserDO();
    owner.setId(2L);
    doc.setUploadedBy(owner);
    doc.setFilePath(null);

    when(documentDao.findById(30L)).thenReturn(Optional.of(doc));

    ragService.deleteDocument(30L, user);

    assertThat(kb.getDocCount()).isEqualTo(2);
    verify(knowledgeBaseDao).save(kb);
    verify(documentDao).deleteById(30L);
  }
}
