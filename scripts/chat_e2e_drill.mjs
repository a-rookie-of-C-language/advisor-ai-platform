#!/usr/bin/env node

import http from 'node:http';

const DEFAULT_BACKEND = 'http://localhost:8080';

function ts() {
  return new Date().toISOString();
}

function log(msg, data) {
  if (data === undefined) {
    console.log(`[${ts()}] ${msg}`);
  } else {
    console.log(`[${ts()}] ${msg}`, data);
  }
}

function randomUser() {
  return `debug_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 10000)}`;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { res, text, json };
}

async function registerAndLogin(baseUrl) {
  const username = randomUser();
  const password = 'Test@123456';

  log('register', { username });
  const reg = await fetchJson(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, realName: 'debug-user', phone: '', email: '' }),
  });
  if (!reg.res.ok) {
    throw new Error(`register failed: ${reg.res.status} ${reg.text}`);
  }

  log('login', { username });
  const login = await fetchJson(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!login.res.ok || !login.json?.data?.token) {
    throw new Error(`login failed: ${login.res.status} ${login.text}`);
  }

  return { username, token: login.json.data.token };
}

async function readSseUntilDone(response, hardTimeoutMs = 600_000) {
  if (!response.body) {
    throw new Error('empty stream body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let hasDelta = false;
  let hasDone = false;
  let hasError = false;
  let deltaCount = 0;

  const kill = setTimeout(async () => {
    try { await reader.cancel(); } catch {}
  }, hardTimeoutMs);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');

      let idx = buffer.indexOf('\n\n');
      while (idx >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        let event = 'message';
        for (const line of block.split('\n')) {
          const trimmed = line.trimEnd();
          if (trimmed.startsWith('event:')) {
            event = trimmed.slice(6).trim();
          }
        }

        if (event === 'delta') {
          hasDelta = true;
          deltaCount += 1;
        }
        if (event === 'error') {
          hasError = true;
        }
        if (event === 'done' || event === 'end') {
          hasDone = true;
          try { await reader.cancel(); } catch {}
          return { hasDelta, hasDone, hasError, deltaCount };
        }

        idx = buffer.indexOf('\n\n');
      }
    }
  } finally {
    clearTimeout(kill);
  }

  return { hasDelta, hasDone, hasError, deltaCount };
}

async function runSmoke(baseUrl) {
  const { username, token } = await registerAndLogin(baseUrl);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  log('create session');
  const create = await fetchJson(`${baseUrl}/api/chat/sessions`, { method: 'POST', headers: auth });
  if (!create.res.ok) throw new Error(`create session failed: ${create.res.status}`);
  const sessionId = create.json?.data?.id;
  if (!sessionId) throw new Error('session id missing');

  log('list sessions');
  const sessions = await fetchJson(`${baseUrl}/api/chat/sessions`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!sessions.res.ok) throw new Error(`list sessions failed: ${sessions.res.status}`);
  const row = (sessions.json?.data ?? []).find((x) => x.id === sessionId);
  if (!row) throw new Error('session not found in list');

  log('non-stream send with fake kbId=999');
  const send = await fetchJson(`${baseUrl}/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ content: 'smoke non-stream: reply OK', kbId: '999' }),
  });
  if (!send.res.ok) throw new Error(`send failed: ${send.res.status}`);

  log('stream send and assert done');
  const streamRes = await fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      sessionId,
      kbId: 999,
      messages: [{ role: 'user', content: 'smoke stream: reply stream ok' }],
    }),
  });
  if (!streamRes.ok) throw new Error(`stream failed: ${streamRes.status}`);
  const stream = await readSseUntilDone(streamRes, 600_000);

  log('list messages');
  const msgs = await fetchJson(`${baseUrl}/api/chat/sessions/${sessionId}/messages`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!msgs.res.ok) throw new Error(`list messages failed: ${msgs.res.status}`);

  const out = {
    username,
    sessionId,
    sessionKbId: row.kbId,
    nonStreamRole: send.json?.data?.role,
    streamHasDone: stream.hasDone,
    streamHasDelta: stream.hasDelta,
    streamHasError: stream.hasError,
    streamDeltaCount: stream.deltaCount,
    messageCount: (msgs.json?.data ?? []).length,
  };

  if (out.sessionKbId !== 0) throw new Error(`expected kbId=0, got ${out.sessionKbId}`);
  if (!out.streamHasDone) throw new Error('expected done event, got none');
  if (out.messageCount < 2) throw new Error(`expected >=2 messages, got ${out.messageCount}`);

  return out;
}

function startTimeoutMockServer(port = 19081) {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    if (req.url === '/first-packet') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders();
      setTimeout(() => {
        res.write('event: done\ndata: {"finish_reason":"stop"}\n\n');
        res.end();
      }, 35_000);
      return;
    }

    if (req.url === '/idle-gap') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders();
      res.write('event: start\ndata: {"message":"started"}\n\n');
      setTimeout(() => {
        res.write('event: done\ndata: {"finish_reason":"stop"}\n\n');
        res.end();
      }, 65_000);
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

async function streamWithFrontendTimeout(url, firstPacketMs, idleMs) {
  const controller = new AbortController();
  let timeoutType = null;
  let firstTimer = null;
  let idleTimer = null;

  const clearFirst = () => { if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; } };
  const clearIdle = () => { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } };

  const startFirst = () => {
    clearFirst();
    firstTimer = setTimeout(() => {
      timeoutType = 'first_packet';
      controller.abort();
    }, firstPacketMs);
  };

  const resetIdle = () => {
    clearIdle();
    idleTimer = setTimeout(() => {
      timeoutType = 'idle';
      controller.abort();
    }, idleMs);
  };

  startFirst();

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!resp.ok || !resp.body) throw new Error(`stream failed: ${resp.status}`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let sawAny = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');

      let idx = buffer.indexOf('\n\n');
      while (idx >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        if (block.trim()) {
          if (!sawAny) {
            sawAny = true;
            clearFirst();
          }
          resetIdle();
        }

        if (block.includes('event: done') || block.includes('event: end')) {
          clearFirst();
          clearIdle();
          try { await reader.cancel(); } catch {}
          return 'done';
        }

        idx = buffer.indexOf('\n\n');
      }
    }

    throw new Error('stream closed without done event');
  } catch (err) {
    if (timeoutType === 'first_packet') throw new Error('stream timeout: first packet > 30s');
    if (timeoutType === 'idle') throw new Error('stream timeout: idle > 60s');
    if (err instanceof Error && err.name === 'AbortError') throw new Error('stream aborted');
    throw err;
  } finally {
    clearFirst();
    clearIdle();
  }
}

async function runTimeoutDrill() {
  const mock = await startTimeoutMockServer(19081);
  try {
    const result = { firstPacket: null, idleGap: null };

    log('timeout drill first-packet 30s');
    const t1 = Date.now();
    try {
      await streamWithFrontendTimeout(`${mock.baseUrl}/first-packet`, 30_000, 60_000);
      result.firstPacket = { ok: false, reason: 'unexpected success' };
    } catch (e) {
      result.firstPacket = {
        ok: String(e.message).includes('first packet > 30s'),
        error: String(e.message),
        elapsedMs: Date.now() - t1,
      };
    }

    log('timeout drill idle-gap 60s');
    const t2 = Date.now();
    try {
      await streamWithFrontendTimeout(`${mock.baseUrl}/idle-gap`, 30_000, 60_000);
      result.idleGap = { ok: false, reason: 'unexpected success' };
    } catch (e) {
      result.idleGap = {
        ok: String(e.message).includes('idle > 60s'),
        error: String(e.message),
        elapsedMs: Date.now() - t2,
      };
    }

    if (!result.firstPacket?.ok) {
      throw new Error(`first packet drill failed: ${JSON.stringify(result.firstPacket)}`);
    }
    if (!result.idleGap?.ok) {
      throw new Error(`idle drill failed: ${JSON.stringify(result.idleGap)}`);
    }

    return result;
  } finally {
    await mock.close();
  }
}

function parseArgs(argv) {
  const mode = argv[2] || 'smoke';
  const baseUrl = argv[3] || DEFAULT_BACKEND;
  return { mode, baseUrl };
}

async function main() {
  const { mode, baseUrl } = parseArgs(process.argv);

  if (mode === 'smoke') {
    const result = await runSmoke(baseUrl);
    console.log(JSON.stringify({ ok: true, mode, result }, null, 2));
    return;
  }
  if (mode === 'timeout') {
    const result = await runTimeoutDrill();
    console.log(JSON.stringify({ ok: true, mode, result }, null, 2));
    return;
  }
  if (mode === 'all') {
    const smoke = await runSmoke(baseUrl);
    const timeout = await runTimeoutDrill();
    console.log(JSON.stringify({ ok: true, mode, smoke, timeout }, null, 2));
    return;
  }

  throw new Error('unknown mode, use smoke|timeout|all');
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
