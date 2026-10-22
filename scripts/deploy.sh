#!/bin/sh
# Deploys the committed HEAD to Dokploy as a "drop" (uploaded source) build.
# Dokploy builds the Dockerfile on the host and replaces the service; the
# container migrates before it serves (scripts/container-start.sh).
#
# Host details are not in this repository. They come from `.env.deploy`
# (git-ignored), which sets:
#   SIGI_DEPLOY_HOST        ssh target, e.g. root@host
#   SIGI_DEPLOY_PATH        host directory holding data/, .env and .deploy/
#   SIGI_DOKPLOY_URL        Dokploy's public URL (for status reads)
#   SIGI_DOKPLOY_LOCAL_URL  Dokploy as the host reaches it (for the upload)
#   SIGI_DOKPLOY_APP        the Dokploy applicationId
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
  api_get deployment.all "{\"applicationId\":\"$SIGI_DOKPLOY_APP\"}" |
    node -e 'let t="";process.stdin.on("data",c=>t+=c).on("end",()=>{const d=JSON.parse(t).result.data.json[0]??{};process.stdout.write(`${d.deploymentId??""} ${d.status??""} ${d.logPath??""}`)})'
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
# The host has little disk to spare; build cache from earlier builds goes first.
ssh "$SIGI_DEPLOY_HOST" 'docker builder prune -af >/dev/null 2>&1; docker image prune -f >/dev/null 2>&1; true'

before=$(latest | cut -d' ' -f1)
echo "==> building and starting on the host"
printf 'x-api-key: %s\n' "$KEY" | ssh "$SIGI_DEPLOY_HOST" "curl -sS --fail-with-body -o /dev/null -H @- \
  -F applicationId=$SIGI_DOKPLOY_APP -F 'zip=@$SIGI_DEPLOY_PATH/.deploy/sigi.zip;type=application/zip' \
  '$SIGI_DOKPLOY_LOCAL_URL/api/trpc/application.dropDeployment'"
attempt=0
while :; do
  sleep 5
  set -- $(latest)
  if [ "${1:-}" != "$before" ]; then
    case ${2:-} in
      done) break ;;
      error | cancelled)
        echo "deployment $2; build log on the host: ${3:-}" >&2
        exit 1
        ;;
    esac
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 180 ]; then
    echo "deployment did not finish within 15 minutes" >&2
    exit 1
  fi
done

# The new container migrates before it listens; give it a minute to answer.
echo "==> checking $SIGI_PUBLIC_URL"
attempt=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$SIGI_PUBLIC_URL/data")" = 200 ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 24 ]; then
    echo "$SIGI_PUBLIC_URL/data did not answer 200 within two minutes" >&2
    exit 1
  fi
  sleep 5
done
codes=$(for path in / /data /login /admin; do
  curl -s -o /dev/null -w "$path %{http_code}  " "$SIGI_PUBLIC_URL$path"
done)
echo "    $codes"
ssh "$SIGI_DEPLOY_HOST" 'docker builder prune -af >/dev/null 2>&1; df -h / | awk "NR==2 {print \"    \" \$4 \" free on /\"}"'
echo "==> deployed $commit"
