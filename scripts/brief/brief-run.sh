#!/bin/sh
# The daily brief (PRD F12, D-025): "what changed in the data Sigi tracks, and
# what is worth a closer look?". Installed into /opt/sigi-brief/ and called from
# the host crontab every hour at :10; it acts only in the 06:00 hour in Jakarta,
# so the brief is there before the 09:00 WIB market open. The schedule needs no
# timezone setting on the host.
#
#   brief-run.sh             # cron: runs only between 06:00 and 06:59 Jakarta
#   brief-run.sh --any-hour  # by hand
#
# Step 1 exports Sigi's context with scripts/brief-context.ts in a throwaway
# container of the deployed worker image: no network, the data directory
# mounted read-only. Step 2 copies the theses out of that image. Step 3 runs
# Claude Code as the unprivileged user sunrise-agent in --restricted mode (no
# shell), which reads those files and yesterday's brief, searches the web and
# writes one file: analysis/<date>.json. The web page validates that file; this
# script never publishes anything itself.
#
# Why /opt/sigi-brief and not /opt/sigi/data/brief: /opt/sigi is private to the
# web and worker (mode 700), and the agent must not be able to reach the
# database or the landing store. The web container sees this directory at
# /opt/sigi/data/brief through a bind mount.
set -eu

BASE=/opt/sigi-brief
DATA=/opt/sigi/data
LOGS="$BASE/logs"
LOG="$LOGS/brief.log"
CONTEXT_DIR="$BASE/context"
ANALYSIS_DIR="$BASE/analysis"
THESES_DIR="$BASE/theses"
CREDENTIAL=/home/sunrise-agent/.claude-credential.env
CLAUDE=/home/sunrise-agent/.local/bin/claude
mkdir -p "$LOGS"

JAKARTA() { TZ=Asia/Jakarta date "$@"; }

if [ "${1:-}" != "--any-hour" ] && [ "$(JAKARTA +%H)" != "06" ]; then
  exit 0
fi

if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 2097152 ]; then
  tail -c 1048576 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

exec 9> /run/sigi-brief.lock
flock -n 9 || exit 0

stamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }

if [ ! -s "$CREDENTIAL" ]; then
  echo "$(stamp) brief skipped: no Claude credential in $CREDENTIAL" >> "$LOG"
  exit 0
fi

DAY=$(JAKARTA +%Y-%m-%d)
YESTERDAY=$(JAKARTA -d yesterday +%Y-%m-%d)
NOW=$(stamp)
CONTEXT="$CONTEXT_DIR/$DAY.json"
OUT="$ANALYSIS_DIR/$DAY.json"

# The image the worker runs, so the export is the deployed build.
CONTAINER=$(docker ps -q --filter name=sigi-worker | head -n 1)
if [ -z "$CONTAINER" ]; then
  echo "$(stamp) brief FAILED: no sigi-worker container to take the image from" >> "$LOG"
  exit 1
fi
IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")

echo "$(stamp) brief start" >> "$LOG"
TMP="$CONTEXT.tmp"
if docker run --rm --network none --memory 1g \
  -v "$DATA:$DATA:ro" \
  -w /opt/sigi \
  --entrypoint node "$IMAGE" \
  --import tsx scripts/brief-context.ts \
  > "$TMP" 2>> "$LOG"; then
  chmod 644 "$TMP"
  mv "$TMP" "$CONTEXT"
else
  echo "$(stamp) brief FAILED: context export, exit $?" >> "$LOG"
  rm -f "$TMP"
  exit 1
fi

# The theses are files in the image, not on the host: copy the current set.
rm -rf "$THESES_DIR"
mkdir -p "$THESES_DIR"
if ! docker run --rm --network none --entrypoint sh "$IMAGE" \
  -c 'cd /opt/sigi && if [ -d theses ]; then tar -cf - theses; else tar -cf - -T /dev/null; fi' \
  | tar -xf - -C "$BASE" 2>> "$LOG"; then
  echo "$(stamp) brief: could not copy the theses out of the image" >> "$LOG"
fi
chmod -R a+rX "$THESES_DIR"

PROMPT=$(sed -e "s|{{DATE}}|$DAY|g" -e "s|{{NOW}}|$NOW|g" -e "s|{{YESTERDAY}}|$YESTERDAY|g" \
  -e "s|{{CONTEXT}}|$CONTEXT|g" "$BASE/brief-prompt.md")

if timeout 20m runuser -u sunrise-agent -- sh -c '
  set -a; . "$1"; set +a
  cd "$2"
  exec "$7" -p "$3" \
    --restricted --strict-mcp-config \
    --tools Read Glob Grep Write WebSearch WebFetch \
    --permission-mode dontAsk \
    --settings "$4" \
    --add-dir "$5" --add-dir "$6" \
    --model sonnet \
    --output-format text
' sh "$CREDENTIAL" "$ANALYSIS_DIR" "$PROMPT" "$BASE/brief-settings.json" \
  "$CONTEXT_DIR" "$THESES_DIR" "$CLAUDE" >> "$LOG" 2>&1; then
  echo "$(stamp) brief agent done" >> "$LOG"
else
  echo "$(stamp) brief agent FAILED: exit $?" >> "$LOG"
fi

if [ -s "$OUT" ]; then
  chmod 644 "$OUT"
  echo "$(stamp) brief analysis written: $OUT" >> "$LOG"
else
  echo "$(stamp) brief analysis MISSING: $OUT" >> "$LOG"
  exit 1
fi
