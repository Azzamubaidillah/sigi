#!/bin/sh
# Entry point of the Sigi image: migrate, then serve.
#
# `set -e` stops here if the migration fails, so the web never starts against
# a schema it was not written for; the container exits and the failure shows in
# its log instead of as wrong pages.
set -eu
cd /opt/sigi
node --import tsx scripts/migrate.ts
exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${SIGI_PORT:-3220}"
