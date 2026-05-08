package cn.edu.cqut.advisorplatform.riskcontrol.dao.impl;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.TrackingEventDao;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.TrackingEvent;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.TrackingEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TrackingEventDaoImpl implements TrackingEventDao {

  private final TrackingEventRepository trackingEventRepository;

  @Override
  public TrackingEvent save(TrackingEvent event) {
    return trackingEventRepository.save(event);
  }
}
