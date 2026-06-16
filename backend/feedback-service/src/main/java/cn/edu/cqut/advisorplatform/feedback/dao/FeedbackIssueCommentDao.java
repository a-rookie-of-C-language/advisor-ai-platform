package cn.edu.cqut.advisorplatform.feedback.dao;

import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueCommentDO;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackIssueCommentDao extends JpaRepository<FeedbackIssueCommentDO, Long> {

  List<FeedbackIssueCommentDO> findByIssueIdOrderByCreatedAtAsc(Long issueId);
}
