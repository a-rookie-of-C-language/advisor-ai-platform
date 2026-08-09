export type TrackerDisposer = () => void;

export function setupClickTracking(
  trackClick: (elementId: string, extraData?: Record<string, unknown>) => void,
): TrackerDisposer {
  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const elementId = target.id || target.getAttribute('data-track-id') || '';
    if (elementId) {
      trackClick(elementId);
    }
  };

  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}

export function setupErrorTracking(
  trackError: (error: Error, extraData?: Record<string, unknown>) => void,
): TrackerDisposer {
  const handleError = (event: ErrorEvent) => {
    trackError(event.error || new Error(event.message));
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    trackError(new Error(String(event.reason)));
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}

export function setupPerformanceTracking(
  trackPerformance: (metrics: Record<string, number>) => void,
): TrackerDisposer {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return () => {};
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const handleLoad = () => {
    timeoutId = setTimeout(() => {
      const perfEntries = performance.getEntriesByType('navigation');
      if (perfEntries.length > 0) {
        const nav = perfEntries[0] as PerformanceNavigationTiming;
        trackPerformance({
          dns: nav.domainLookupEnd - nav.domainLookupStart,
          tcp: nav.connectEnd - nav.connectStart,
          ttfb: nav.responseStart - nav.requestStart,
          domReady: nav.domContentLoadedEventEnd - nav.fetchStart,
          load: nav.loadEventEnd - nav.fetchStart,
        });
      }
    }, 0);
  };

  window.addEventListener('load', handleLoad);
  return () => {
    window.removeEventListener('load', handleLoad);
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}
