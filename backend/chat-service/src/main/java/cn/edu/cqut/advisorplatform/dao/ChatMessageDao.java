package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
<<<<<<< HEAD
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageDao extends JpaRepository<ChatMessageDO, Long> {

  List<ChatMessageDO> findBySessionIdOrderByCreatedAtAscIdAsc(Long sessionId);

  boolean existsBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role);

  boolean existsBySessionIdAndRole(Long sessionId, String role);

  Optional<ChatMessageDO> findFirstBySessionIdAndTurnIdAndRole(
      Long sessionId, String turnId, String role);
=======
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMessageDao extends JpaRepository<ChatMessageDO, Long> {

    List<ChatMessageDO> findBySessionIdOrderByCreatedAtAscIdAsc(Long sessionId);

    boolean existsBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role);

    boolean existsBySessionIdAndRole(Long sessionId, String role);

    Optional<ChatMessageDO> findFirstBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role);
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
