package cn.edu.cqut.advisorplatform.checkin.service.impl.checkin;

import cn.edu.cqut.advisorplatform.checkin.record.dto.response.CheckInRecordItem;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class CheckInDetailResponseFactory {

  StudentCheckInDetailResponse create(
      StudentCheckInSummaryResponse summary, List<CheckInRecordVO> records) {
    StudentCheckInDetailResponse response = new StudentCheckInDetailResponse();
    response.setSummary(summary);
    response.setRecentRecords(records.stream().map(this::toRecordItem).toList());
    return response;
  }

  private CheckInRecordItem toRecordItem(CheckInRecordVO record) {
    CheckInRecordItem item = new CheckInRecordItem();
    item.setCheckDate(record.getCheckDate().toString());
    item.setCheckedIn(record.getCheckedIn());
    item.setCheckTime(record.getCheckTime());
    return item;
  }
}
