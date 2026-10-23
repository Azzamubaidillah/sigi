#!/bin/sh
# Deploys the committed HEAD to Dokploy as "drop" (uploaded source) builds of
# two applications from the one Dockerfile: the web (default stage), then the
# worker (build stage `worker`). The web migrates before it serves
# (scripts/container-start.sh); the worker waits for that.
#
# Host details are not in this repository. They come from `.env.deploy`
# (git-ignored), which sets:
#   SIGI_DEPLOY_HOST        ssh target, e.g. root@host
#   SIGI_DEPLOY_PATH        host directory holding data/, .env and .deploy/
#   SIGI_DOKPLOY_URL        Dokploy's public URL (for status reads)
#   SIGI_DOKPLOY_LOCAL_URL  Dokploy as the host reaches it (for the upload)
#   SIGI_DOKPLOY_APP        the web's Dokploy applicationId
#   SIGI_DOKPLOY_WORKER_APP the worker's Dokploy applicationId
#   SIGI_PUBLIC_URL         the site's public origin, checked after the deploy
# The Dokploy API key is read from the macOS Keychain (service dokploy-api-key)
# and reaches the host on ssh's stdin, never on a command line.
set -eu
cd "$(dirname "$0")/.."
. ./.env.deploy

if [ -n "$(git status --porcelain)" ]; then
  echo "uncommitted changes; deploy deploys HEAD only, so commit first" >&2
  exit 1
fi
KEY=$(security find-generic-password -s dokploy-api-key -w) || {
  echo "no Dokploy API key in the Keychain (service dokploy-api-key)" >&2
  exit 1
}

api_get() {
  input=$(node -e 'process.stdout.write(encodeURIComponent(JSON.stringify({ json: JSON.parse(process.argv[1]) })))' "$2")
  curl -sS --fail-with-body -H "x-api-key: $KEY" "$SIGI_DOKPLOY_URL/api/trpc/$1?input=$input"
}

latest() {
  api_get deployment.all "{\"applicationId\":\"$1\"}" |
    node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>{const d=JSON.parse(t).result.data.json[0]??{};process.stdout.write(`${d.deploymentId??""} ${d.status??""} ${d.logPath??""}`)})'
}

# Dokploy reports "done" once it has updated the swarm service, before the
# swarm has swapped the container. Waits for the swarm's rollout as well.
rolled_out() {
  service=$(api_get application.one "{\"applicationId\":\"$1\"}" |
    node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>process.stdout.write(JSON.parse(t).result.data.json.appName))')
  attempt=0
  while :; do
    state=$(ssh "$SIGI_DEPLOY_HOST" "docker service inspect '$service' --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}completed{{end}}'")
    case $state in
      completed) return 0 ;;
      paused | rollback_*)
        echo "$2 rollout $state; see docker service ps $service on the host" >&2
        exit 1
        ;;
    esac
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 36 ]; then
      echo "$2 rollout still $state after three minutes" >&2
      exit 1
    fi
    sleep 5
  done
}

# Builds and starts one application from the uploaded bundle, and waits.
deploy_app() {
  app=$1
  label=$2
  before=$(latest "$app" | cut -d' ' -f1)
  echo "==> building and starting the $label"
  printf 'x-api-key: %s\n' "$KEY" | ssh "$SIGI_DEPLOY_HOST" "curl -sS --fail-with-body -o /dev/null -H @- \
    -F applicationId=$app -F 'zip=@$SIGI_DEPLOY_PATH/.deploy/sigi.zip;type=application/zip' \
    '$SIGI_DOKPLOY_LOCAL_URL/api/trpc/application.dropDeployment'"
  attempt=0
  while :; do
    sleep 5
    set -- $(latest "$app")
    if [ "${1:-}" != "$before" ]; then
      case ${2:-} in
        done) break ;;
        error | cancelled)
          echo "$label deployment $2; build log on the host: ${3:-}" >&2
          exit 1
          ;;
      esac
    fi
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 180 ]; then
      echo "$label deployment did not finish within 15 minutes" >&2
      exit 1
    fi
  done
  rolled_out "$app" "$label"
}

echo "==> verify"
pnpm verify >/dev/null

commit=$(git rev-parse --short HEAD)
bundle=$(mktemp -d)/sigi.zip
trap 'rm -rf "$(dirname "$bundle")"' EXIT
git archive --format=zip -o "$bundle" HEAD
echo "==> uploading $commit ($(wc -c <"$bundle" | tr -d ' ') bytes)"
ssh "$SIGI_DEPLOY_HOST" "mkdir -p '$SIGI_DEPLOY_PATH/.deploy'"
scp -q "$bundle" "$SIGI_DEPLOY_HOST:$SIGI_DEPLOY_PATH/.deploy/sigi.zip"
# The host has little disk to spare; build cache from earlier builds goes
# first. The worker's build then reuses the web's dependency layers.
ssh "$SIGI_DEPLOY_HOST" 'docker builder prune -af >/dev/null 2>&1; docker image prune -f >/dev/null 2>&1; true'

deploy_app "$SIGI_DOKPLOY_APP" web

# The new container migrates before it listens; give it two minutes.
echo "==> checking $SIGI_PUBLIC_URL"
round() {
  for path in / /data /investability /holders; do
    curl -s -o /dev/null -w "$path %{http_code}  " "$SIGI_PUBLIC_URL$path"
  done
}
attempt=0
codes=$(round)
while [ "$(printf '%s' "$codes" | grep -o ' 200 ' | wc -l | tr -d ' ')" != 4 ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 24 ]; then
    echo "pages did not all answer 200 within two minutes: $codes" >&2
    exit 1
  fi
  sleep 5
  codes=$(round)
done
echo "    $codes"

deploy_app "$SIGI_DOKPLOY_WORKER_APP" worker

ssh "$SIGI_DEPLOY_HOST" 'docker builder prune -af >/dev/null 2>&1; df -h / | awk "NR==2 {print \"    \" \$4 \" free on /\"}"'
echo "==> deployed $commit"
