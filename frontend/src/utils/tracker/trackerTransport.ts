import type { TrackingEvent } from './types';

export async function sendTrackingEvents(apiUrl: string, events: TrackingEvent[]): Promise<void> {
  const response = await fetch(`${apiUrl}/api/tracking/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(events),
  });

  if (!response.ok) {
    throw new Error(`Tracking request failed: ${response.status} ${response.statusText}`);
  }
}
