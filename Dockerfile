# Sigi images, built from source on the host (unlike Sunrise, which builds on
# a workstation and uploads), so a deploy needs only this repository.
#
# Two targets from one file. The last stage, `web`, is the default: the
# public site, which migrates the database and serves. `worker` is the
# fetcher: Google Chrome and Xvfb, and no web build. Dokploy builds each from
# its own application (the worker sets its build stage to `worker`).
#
# Data (the SQLite file and the landing store) lives on a host directory
# mounted at /opt/sigi/data, owned by the image's unprivileged `node` user.
FROM node:24.9.0-bookworm-slim AS base
WORKDIR /opt/sigi
RUN npm install --global pnpm@10.33.0

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
# Full install: both images run TypeScript scripts through tsx.
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# Chrome is Google's current stable build, not a pinned one: Cloudflare's
# challenge is passed by looking like a current browser (DECISIONS D-021).
FROM base AS worker
ADD https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb /tmp/chrome.deb
RUN apt-get update \
  && apt-get install -y --no-install-recommends /tmp/chrome.deb xvfb fonts-liberation \
  && rm -rf /var/lib/apt/lists/* /tmp/chrome.deb \
  && mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix
ENV NODE_ENV=production SIGI_DATA_DIR=/opt/sigi/data SIGI_CHROME_PATH=/usr/bin/google-chrome
COPY --from=deps /opt/sigi/node_modules ./node_modules
COPY . .
RUN mkdir -p /opt/sigi/data && chown node:node /opt/sigi/data
USER node
ENTRYPOINT ["node", "--env-file-if-exists=.env", "--import", "tsx", "scripts/worker.ts"]

FROM base AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 SIGI_DATA_DIR=/opt/sigi/data
COPY --from=deps /opt/sigi/node_modules ./node_modules
COPY . .
COPY --from=build /opt/sigi/.next ./.next
RUN mkdir -p /opt/sigi/data && chown node:node /opt/sigi/data
USER node
EXPOSE 3220
ENTRYPOINT ["sh", "scripts/container-start.sh"]
