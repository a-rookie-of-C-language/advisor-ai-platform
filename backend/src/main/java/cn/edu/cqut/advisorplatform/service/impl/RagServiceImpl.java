package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.RagDocumentDao;
import cn.edu.cqut.advisorplatform.dao.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponse;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponse;
import cn.edu.cqut.advisorplatform.entity.RagDocument;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBase;
import cn.edu.cqut.advisorplatform.entity.User;
import cn.edu.cqut.advisorplatform.service.RagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagServiceImpl implements RagService {

    private final RagKnowledgeBaseDao knowledgeBaseDao;
    private final RagDocumentDao documentDao;

    @Value("${advisor.rag.upload-dir}")
    private String uploadDir;

    @Override
    public List<KnowledgeBaseResponse> listKnowledgeBases(User currentUser) {
        return knowledgeBaseDao.findByCreatedByIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(KnowledgeBaseResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public KnowledgeBaseResponse createKnowledgeBase(String name, String description, User currentUser) {
        RagKnowledgeBase kb = new RagKnowledgeBase();
        kb.setName(name);
        kb.setDescription(description);
        kb.setCreatedBy(currentUser);
        kb.setDocCount(0);
        kb.setStatus(RagKnowledgeBase.KnowledgeBaseStatus.READY);
        kb.setCreatedAt(LocalDateTime.now());
        kb.setUpdatedAt(LocalDateTime.now());
        return KnowledgeBaseResponse.from(knowledgeBaseDao.save(kb));
    }

    @Override
    @Transactional
    public void deleteKnowledgeBase(Long id, User currentUser) {
        RagKnowledgeBase kb = knowledgeBaseDao.findById(id)
                .orElseThrow(() -> new RuntimeException("知识库不存在"));
        if (!kb.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("无权限删除该知识库");
        }
        // 删除本地文件目录
        Path kbDir = Paths.get(uploadDir, id.toString());
        deleteDirectoryQuietly(kbDir);
        knowledgeBaseDao.deleteById(id);
    }

    @Override
    public List<RagDocumentResponse> listDocuments(Long kbId, User currentUser) {
        // 验证知识库归属
        knowledgeBaseDao.findById(kbId)
                .filter(kb -> kb.getCreatedBy().getId().equals(currentUser.getId()))
                .orElseThrow(() -> new RuntimeException("知识库不存在或无权限"));
        return documentDao.findByKnowledgeBaseIdOrderByCreatedAtDesc(kbId)
                .stream()
                .map(RagDocumentResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RagDocumentResponse uploadDocument(Long kbId, MultipartFile file, User currentUser) {
        RagKnowledgeBase kb = knowledgeBaseDao.findById(kbId)
                .filter(k -> k.getCreatedBy().getId().equals(currentUser.getId()))
                .orElseThrow(() -> new RuntimeException("知识库不存在或无权限"));

        // 获取文件扩展名
        String originalFilename = file.getOriginalFilename();
        String fileType = extractExtension(originalFilename);

        // 保存文件到磁盘: uploads/{kbId}/{originalFilename}
        Path dir = Paths.get(uploadDir, kbId.toString());
        try {
            Files.createDirectories(dir);
            Path filePath = dir.resolve(originalFilename);
            file.transferTo(filePath.toFile());

            // 写入数据库（status=PENDING，触发器自动 NOTIFY）
            RagDocument doc = new RagDocument();
            doc.setKnowledgeBase(kb);
            doc.setFileName(originalFilename);
            doc.setFileType(fileType);
            doc.setFileSize(file.getSize());
            doc.setFilePath(filePath.toAbsolutePath().toString());
            doc.setStatus(RagDocument.DocumentStatus.PENDING);
            doc.setUploadedBy(currentUser);
            doc.setCreatedAt(LocalDateTime.now());
            doc.setUpdatedAt(LocalDateTime.now());
            RagDocument saved = documentDao.save(doc);

            // 更新知识库文档数量
            kb.setDocCount(kb.getDocCount() + 1);
            kb.setUpdatedAt(LocalDateTime.now());
            knowledgeBaseDao.save(kb);

            log.info("文档上传成功，documentId={}, path={}", saved.getId(), filePath);
            return RagDocumentResponse.from(saved);

        } catch (IOException e) {
            throw new RuntimeException("文件保存失败: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void deleteDocument(Long id, User currentUser) {
        RagDocument doc = documentDao.findById(id)
                .orElseThrow(() -> new RuntimeException("文档不存在"));
        if (!doc.getUploadedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("无权限删除该文档");
        }
        // 删除物理文件
        if (doc.getFilePath() != null) {
            deleteFileQuietly(Paths.get(doc.getFilePath()));
        }
        // 更新知识库文档数量
        RagKnowledgeBase kb = doc.getKnowledgeBase();
        kb.setDocCount(Math.max(0, kb.getDocCount() - 1));
        kb.setUpdatedAt(LocalDateTime.now());
        knowledgeBaseDao.save(kb);

        documentDao.deleteById(id);
    }

    // ── 工具方法 ──

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "unknown";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private void deleteFileQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("删除文件失败: {}", path, e);
        }
    }

    private void deleteDirectoryQuietly(Path dir) {
        if (!Files.exists(dir)) return;
        try {
            Files.walk(dir)
                    .sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.delete(p); } catch (IOException e) { log.warn("删除失败: {}", p); }
                    });
        } catch (IOException e) {
            log.warn("删除目录失败: {}", dir, e);
        }
    }
}
