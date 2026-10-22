#!/bin/sh
# Entry point of the Sigi image: migrate, then serve.
#
# `set -e` stops here if the migration fails, so the web never starts against
# a schema it was not written for; the container exits and the failure shows in
# its log instead of as wrong pages.
#
# Configuration comes from the environment and, when the host mounts one, from
# /opt/sigi/.env (secrets stay in a host file, not in the image or the
# deployment tool). SIGI_BIND_HOST is 127.0.0.1 when the container shares the
# host's network, so only the host's reverse proxy can reach it.
set -eu
cd /opt/sigi
node --env-file-if-exists=.env --import tsx scripts/migrate.ts
exec node --env-file-if-exists=.env node_modules/next/dist/bin/next start \
  --hostname "${SIGI_BIND_HOST:-0.0.0.0}" --port "${SIGI_PORT:-3220}"
