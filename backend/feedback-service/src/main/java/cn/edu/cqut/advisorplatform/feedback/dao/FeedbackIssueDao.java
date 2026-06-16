package cn.edu.cqut.advisorplatform.feedback.dao;

import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueDO;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackIssueDao extends JpaRepository<FeedbackIssueDO, Long> {

  List<FeedbackIssueDO> findAllByOrderByUpdatedAtDesc();
}
