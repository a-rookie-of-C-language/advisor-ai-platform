import {
  setupClickTracking,
  setupErrorTracking,
  setupPerformanceTracking,
} from './autoTrackers';
import type { TrackerDisposer } from './autoTrackers';
import { normalizeTrackerConfig } from './trackerConfig';
import { sendTrackingEvents } from './trackerTransport';
import type { TrackingEvent, TrackerConfig } from './types';

export class Tracker {
  private config: TrackerConfig;
  private queue: TrackingEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private autoTrackDisposers: TrackerDisposer[] = [];

  constructor(config: TrackerConfig) {
    this.config = normalizeTrackerConfig(config);

    if (this.config.autoTrack?.pageView) {
      this.trackPageView();
    }
    if (this.config.autoTrack?.click) {
      this.autoTrackDisposers.push(
        setupClickTracking((elementId, extraData) => this.trackClick(elementId, extraData)),
      );
    }
    if (this.config.autoTrack?.error) {
      this.autoTrackDisposers.push(
        setupErrorTracking((error, extraData) => this.trackError(error, extraData)),
      );
    }
    if (this.config.autoTrack?.performance) {
      this.autoTrackDisposers.push(
        setupPerformanceTracking((metrics) => this.trackPerformance(metrics)),
      );
    }

    this.startFlushTimer();
  }

  track(event: Omit<TrackingEvent, 'timestamp' | 'userId' | 'sessionId' | 'pageUrl'>): void {
    const fullEvent: TrackingEvent = {
      ...event,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      pageUrl: window.location.href,
      timestamp: Date.now(),
    };

    this.queue.push(fullEvent);

    if (this.queue.length >= (this.config.batchSize || 10)) {
      this.flush();
    }
  }

  trackPageView(): void {
    this.track({
      eventType: 'page_view',
      eventName: 'page_view',
    });
  }

  trackClick(elementId: string, extraData?: Record<string, unknown>): void {
    this.track({
      eventType: 'click',
      eventName: 'click',
      elementId,
      extraData,
    });
  }

  trackSubmit(formId: string, extraData?: Record<string, unknown>): void {
    this.track({
      eventType: 'submit',
      eventName: 'submit',
      elementId: formId,
      extraData,
    });
  }

  trackError(error: Error, extraData?: Record<string, unknown>): void {
    this.track({
      eventType: 'error',
      eventName: 'error',
      extraData: {
        message: error.message,
        stack: error.stack,
        ...extraData,
      },
    });
  }

  trackPerformance(metrics: Record<string, number>): void {
    this.track({
      eventType: 'performance',
      eventName: 'performance',
      extraData: metrics,
    });
  }

  setUserId(userId: number): void {
    this.config.userId = userId;
  }

  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const events = [...this.queue];
    this.queue = [];

    try {
      await sendTrackingEvents(this.config.apiUrl, events);
    } catch (error) {
      console.error('Failed to send tracking events:', error);
      this.queue = [...events, ...this.queue];
    }
  }

  private startFlushTimer(): void {
    if (this.config.flushInterval) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.autoTrackDisposers.forEach((dispose) => dispose());
    this.autoTrackDisposers = [];
    void this.flush();
  }
}
