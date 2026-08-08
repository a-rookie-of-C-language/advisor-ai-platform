package cn.edu.cqut.advisorplatform.controller.chat;

import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import java.util.List;

record ChatOnceProxyResult(
    String assistantText, List<SourceReference> sources, List<StreamEventRecord> events) {}
