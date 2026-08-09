import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tracker } from './tracker';

describe('Tracker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes auto click tracking listener on destroy', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const tracker = new Tracker({
      apiUrl: 'http://localhost:8080',
      autoTrack: {
        pageView: false,
        click: true,
        error: false,
        performance: false,
      },
      batchSize: 1,
      flushInterval: 0,
    });

    document.body.innerHTML = '<button data-track-id="send">Send</button>';
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    tracker.destroy();
    document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps queued events when tracking transport returns non-ok response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const tracker = new Tracker({
      apiUrl: 'http://localhost:8080',
      autoTrack: {
        pageView: false,
        click: false,
        error: false,
        performance: false,
      },
      flushInterval: 0,
    });

    tracker.track({
      eventType: 'custom',
      eventName: 'retry_me',
    });

    await tracker.flush();
    await tracker.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(fetchMock.mock.calls[0][1]?.body);
  });
});
