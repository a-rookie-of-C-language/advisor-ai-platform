package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ImportBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImportBatchDao extends JpaRepository<ImportBatch, Long> {

  Page<ImportBatch> findByCreatedByOrderByCreatedAtDesc(String createdBy, Pageable pageable);

  Page<ImportBatch> findAllByOrderByCreatedAtDesc(Pageable pageable);

  java.util.Optional<ImportBatch> findByBatchNo(String batchNo);
}
