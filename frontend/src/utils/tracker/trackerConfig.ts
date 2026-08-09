import type { TrackerConfig } from './types';

const DEFAULT_TRACKER_CONFIG: Omit<TrackerConfig, 'apiUrl'> = {
  batchSize: 10,
  flushInterval: 5000,
  autoTrack: {
    pageView: true,
    click: true,
    error: true,
    performance: true,
  },
};

export function normalizeTrackerConfig(config: TrackerConfig): TrackerConfig {
  return {
    ...DEFAULT_TRACKER_CONFIG,
    ...config,
    autoTrack: {
      ...DEFAULT_TRACKER_CONFIG.autoTrack,
      ...config.autoTrack,
    },
  };
}
