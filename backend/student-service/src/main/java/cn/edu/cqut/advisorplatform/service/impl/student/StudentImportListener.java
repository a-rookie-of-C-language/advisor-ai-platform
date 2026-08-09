package cn.edu.cqut.advisorplatform.service.impl.student;

import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.read.listener.ReadListener;

public class StudentImportListener implements ReadListener<StudentImportData> {

  private final StudentImportDataHolder holder;

  public StudentImportListener(StudentImportDataHolder holder) {
    this.holder = holder;
  }

  @Override
  public void invoke(StudentImportData data, AnalysisContext context) {
    data.rowNum = context.readRowHolder().getRowIndex() + 2;
    if (data.studentNo != null && !data.studentNo.isBlank()) {
      holder.dataList.add(data);
    }
  }

  @Override
  public void doAfterAllAnalysed(AnalysisContext context) {}
}
