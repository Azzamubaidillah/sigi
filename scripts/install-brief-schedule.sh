#!/bin/sh
# Installs the daily brief's schedule on the host (PRD F12, D-025). Run from
# the repository root; idempotent:
#
#   sh scripts/install-brief-schedule.sh
#
# Host details come from the git-ignored .env.deploy (SIGI_DEPLOY_HOST).
#
# What it does on the host:
#   - requires the unprivileged user sunrise-agent with Claude Code and its
#     credential (the same user and subscription Sunrise's brief uses);
#   - copies scripts/brief/* to /opt/sigi-brief/ (root-owned);
#   - creates /opt/sigi-brief/{context,analysis,theses,logs}: the agent may
#     write only analysis/, and the web reads the first three through a bind
#     mount at /opt/sigi/data/brief (set once in Dokploy, see the README);
#   - adds one crontab line, hourly at :10, that acts only in the 06:00 hour
#     in Jakarta.
set -eu

cd "$(dirname "$0")/.."
set -a
. ./.env.deploy
set +a
HOST=${SIGI_DEPLOY_HOST:?SIGI_DEPLOY_HOST is not set in .env.deploy}

ssh "$HOST" 'set -eu
if ! id sunrise-agent >/dev/null 2>&1 || [ ! -x /home/sunrise-agent/.local/bin/claude ]; then
  echo "sunrise-agent or its Claude Code is missing" >&2
  exit 1
fi
mkdir -p /opt/sigi-brief && chmod 755 /opt/sigi-brief'

scp -q scripts/brief/brief-run.sh scripts/brief/brief-prompt.md \
  scripts/brief/brief-settings.json "$HOST:/opt/sigi-brief/"

ssh "$HOST" 'set -eu
cd /opt/sigi-brief
chown root:root brief-run.sh brief-prompt.md brief-settings.json
chmod 755 brief-run.sh
chmod 644 brief-prompt.md brief-settings.json

mkdir -p context analysis theses logs
chown root:root context theses logs
chown sunrise-agent:sunrise-agent analysis
chmod 755 context analysis theses
chmod 700 logs

crontab -l > "/root/crontab.before-sigi-brief.$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true
current=$(crontab -l 2>/dev/null | grep -v "# sigi-brief" || true)
{
  printf "%s\n" "$current"
  echo "10 * * * * /opt/sigi-brief/brief-run.sh # sigi-brief"
} | sed "/^$/d" | crontab -
crontab -l | grep "# sigi-brief"
'
echo "Brief schedule installed on $HOST."
