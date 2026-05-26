package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

class AgentStreamReadState {

  private final StringBuilder sseBuffer = new StringBuilder();
  private final StringBuilder deltaPreview = new StringBuilder();
  private final StringBuilder assistantText = new StringBuilder();
  private final AtomicInteger deltaCount = new AtomicInteger();
  private final AtomicBoolean firstDeltaLogged = new AtomicBoolean(false);
  private final AtomicBoolean sawDoneEvent = new AtomicBoolean(false);
  private final AtomicBoolean sawErrorEvent = new AtomicBoolean(false);
  private final List<SourceReference> sources = new ArrayList<>();
  private final List<StreamEventRecord> events = new ArrayList<>();

  StringBuilder sseBuffer() {
    return sseBuffer;
  }

  StringBuilder deltaPreview() {
    return deltaPreview;
  }

  StringBuilder assistantText() {
    return assistantText;
  }

  AtomicInteger deltaCount() {
    return deltaCount;
  }

  AtomicBoolean firstDeltaLogged() {
    return firstDeltaLogged;
  }

  AtomicBoolean sawDoneEvent() {
    return sawDoneEvent;
  }

  AtomicBoolean sawErrorEvent() {
    return sawErrorEvent;
  }

  List<SourceReference> sources() {
    return sources;
  }

  List<StreamEventRecord> events() {
    return events;
  }
}
