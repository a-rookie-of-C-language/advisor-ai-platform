import type { TrackingEvent, TrackerConfig } from './types';

export class Tracker {
  private config: TrackerConfig;
  private queue: TrackingEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: TrackerConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      autoTrack: {
        pageView: true,
        click: true,
        error: true,
        performance: true,
      },
      ...config,
    };

    if (this.config.autoTrack?.pageView) {
      this.trackPageView();
    }
    if (this.config.autoTrack?.click) {
      this.setupClickTracking();
    }
    if (this.config.autoTrack?.error) {
      this.setupErrorTracking();
    }
    if (this.config.autoTrack?.performance) {
      this.setupPerformanceTracking();
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
      await fetch(`${this.config.apiUrl}/api/tracking/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events[0]),
      });
    } catch (error) {
      console.error('Failed to send tracking events:', error);
      this.queue = [...events, ...this.queue];
    }
  }

  private setupClickTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const elementId = target.id || target.getAttribute('data-track-id') || '';
      if (elementId) {
        this.trackClick(elementId);
      }
    });
  }

  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message));
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(String(event.reason)));
    });
  }

  private setupPerformanceTracking(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfEntries = performance.getEntriesByType('navigation');
          if (perfEntries.length > 0) {
            const nav = perfEntries[0] as PerformanceNavigationTiming;
            this.trackPerformance({
              dns: nav.domainLookupEnd - nav.domainLookupStart,
              tcp: nav.connectEnd - nav.connectStart,
              ttfb: nav.responseStart - nav.requestStart,
              domReady: nav.domContentLoadedEventEnd - nav.fetchStart,
              load: nav.loadEventEnd - nav.fetchStart,
            });
          }
        }, 0);
      });
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
    }
    this.flush();
  }
}
