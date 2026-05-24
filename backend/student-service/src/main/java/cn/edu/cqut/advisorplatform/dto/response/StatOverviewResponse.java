package cn.edu.cqut.advisorplatform.dto.response;

public class StatOverviewResponse {

  private long totalStudents;
  private long totalProfiles;
  private long missingInfoCount;
  private long totalTasks;
  private long pendingTasks;
  private long processingTasks;

  public long getTotalStudents() {
    return totalStudents;
  }

  public void setTotalStudents(long totalStudents) {
    this.totalStudents = totalStudents;
  }

  public long getTotalProfiles() {
    return totalProfiles;
  }

  public void setTotalProfiles(long totalProfiles) {
    this.totalProfiles = totalProfiles;
  }

  public long getMissingInfoCount() {
    return missingInfoCount;
  }

  public void setMissingInfoCount(long missingInfoCount) {
    this.missingInfoCount = missingInfoCount;
  }

  public long getTotalTasks() {
    return totalTasks;
  }

  public void setTotalTasks(long totalTasks) {
    this.totalTasks = totalTasks;
  }

  public long getPendingTasks() {
    return pendingTasks;
  }

  public void setPendingTasks(long pendingTasks) {
    this.pendingTasks = pendingTasks;
  }

  public long getProcessingTasks() {
    return processingTasks;
  }

  public void setProcessingTasks(long processingTasks) {
    this.processingTasks = processingTasks;
  }
}
