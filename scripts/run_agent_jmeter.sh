#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-mock}"
PROFILE="${PROFILE:-smoke}"
BASE_URL="${BASE_URL:-}"
TOKEN="${TOKEN:-arookieofc}"
JMETER_BIN="${JMETER_BIN:-jmeter}"
MOCK_PORT="${MOCK_PORT:-18001}"
MOCK_LATENCY_MS="${MOCK_LATENCY_MS:-25}"
MAX_SAMPLE_MS="${MAX_SAMPLE_MS:-600000}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JMETER_DIR="$ROOT/scripts/jmeter"
JMX="$JMETER_DIR/agent-chat-stream.jmx"
CASE_FILE="$JMETER_DIR/agent-chat-cases.csv"
MOCK_SERVER="$JMETER_DIR/agent_jmeter_mock_server.py"
RESULT_ROOT="$JMETER_DIR/results"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULT_DIR="$RESULT_ROOT/$MODE-$PROFILE-$TIMESTAMP"
JTL="$RESULT_DIR/results.jtl"
HTML="$RESULT_DIR/html"
SUMMARY="$RESULT_DIR/summary.json"
MOCK_PID=""

usage() {
  echo "Usage: MODE=mock|real PROFILE=smoke|load|stress|spike $0"
  echo "Optional env: BASE_URL TOKEN JMETER_BIN MOCK_PORT MOCK_LATENCY_MS MAX_SAMPLE_MS"
}

profile_config() {
  case "$PROFILE" in
    smoke) THREADS=1; RAMP_UP=1; DURATION=30; LOOPS=5 ;;
    load) THREADS=10; RAMP_UP=10; DURATION=120; LOOPS=-1 ;;
    stress) THREADS=50; RAMP_UP=30; DURATION=300; LOOPS=-1 ;;
    spike) THREADS=100; RAMP_UP=5; DURATION=60; LOOPS=-1 ;;
    *) usage; exit 2 ;;
  esac
}

wait_http_health() {
  local url="$1"
  for _ in $(seq 1 60); do
    if curl -fsS "$url/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $url/health" >&2
  return 1
}

write_summary() {
  python3 - "$JTL" "$SUMMARY" "$MODE" "$PROFILE" "$BASE_URL" <<'PY'
import csv
import json
import math
import sys

jtl, summary_path, mode, profile, base_url = sys.argv[1:]
with open(jtl, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

elapsed = sorted(float(row.get("elapsed") or 0) for row in rows)
failed = [row for row in rows if row.get("success") != "true"]
timestamps = [float(row.get("timeStamp") or 0) for row in rows]
duration_sec = ((max(timestamps) - min(timestamps)) / 1000) if len(timestamps) > 1 else 1
duration_sec = max(duration_sec, 1)

def percentile(values, pct):
    if not values:
        return 0
    index = math.ceil((pct / 100) * len(values)) - 1
    return values[max(index, 0)]

summary = {
    "mode": mode,
    "profile": profile,
    "baseUrl": base_url,
    "sampleCount": len(rows),
    "errorCount": len(failed),
    "errorRate": round(len(failed) / len(rows), 6) if rows else 0,
    "throughputPerSec": round(len(rows) / duration_sec, 4),
    "avgLatencyMs": round(sum(elapsed) / len(elapsed), 2) if elapsed else 0,
    "p50LatencyMs": round(percentile(elapsed, 50), 2),
    "p95LatencyMs": round(percentile(elapsed, 95), 2),
    "p99LatencyMs": round(percentile(elapsed, 99), 2),
}
with open(summary_path, "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)
PY
}

cleanup() {
  if [[ -n "$MOCK_PID" ]] && kill -0 "$MOCK_PID" >/dev/null 2>&1; then
    kill "$MOCK_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ "$MODE" != "mock" && "$MODE" != "real" ]]; then
  usage
  exit 2
fi

profile_config
mkdir -p "$RESULT_DIR"

if [[ -z "$BASE_URL" ]]; then
  if [[ "$MODE" == "mock" ]]; then
    BASE_URL="http://127.0.0.1:$MOCK_PORT"
  else
    BASE_URL="http://127.0.0.1:8001"
  fi
fi

if [[ "$MODE" == "mock" ]]; then
  PYTHON="$ROOT/agent/.venv/bin/python"
  if [[ ! -x "$PYTHON" ]]; then
    PYTHON="python3"
  fi
  "$PYTHON" "$MOCK_SERVER" --host 127.0.0.1 --port "$MOCK_PORT" --token "$TOKEN" --latency-ms "$MOCK_LATENCY_MS" \
    >"$RESULT_DIR/mock-server.out.log" 2>"$RESULT_DIR/mock-server.err.log" &
  MOCK_PID="$!"
  wait_http_health "$BASE_URL"
fi

"$JMETER_BIN" \
  -n \
  -t "$JMX" \
  -l "$JTL" \
  -e \
  -o "$HTML" \
  -JBASE_URL="$BASE_URL" \
  -JTOKEN="$TOKEN" \
  -JCASE_FILE="$CASE_FILE" \
  -JTHREADS="$THREADS" \
  -JRAMP_UP="$RAMP_UP" \
  -JDURATION="$DURATION" \
  -JLOOPS="$LOOPS" \
  -JMAX_SAMPLE_MS="$MAX_SAMPLE_MS" \
  -Jjmeter.save.saveservice.output_format=csv \
  -Jjmeter.save.saveservice.print_field_names=true

write_summary
echo "JMeter result directory: $RESULT_DIR"
echo "Summary: $SUMMARY"
echo "HTML report: $HTML"
