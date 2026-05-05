export interface TrackingEvent {
  eventId?: string;
  userId?: number;
  sessionId?: string;
  eventType: 'page_view' | 'click' | 'submit' | 'error' | 'performance' | 'custom';
  eventName: string;
  pageUrl?: string;
  elementId?: string;
  extraData?: Record<string, unknown>;
  timestamp?: number;
}

export interface TrackerConfig {
  apiUrl: string;
  userId?: number;
  sessionId?: string;
  autoTrack?: {
    pageView?: boolean;
    click?: boolean;
    error?: boolean;
    performance?: boolean;
  };
  batchSize?: number;
  flushInterval?: number;
}
