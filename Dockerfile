# Sigi runtime image. Built from source in the image (unlike Sunrise, which
# builds on a workstation and uploads), so a deploy needs only this repository.
#
# The container listens on 0.0.0.0 inside its own network namespace; the host
# publishes it on loopback only, and a reverse proxy terminates TLS in front.
# Data (the SQLite file and the landing store) lives on a volume at
# /opt/sigi/data, owned by the image's unprivileged `node` user.
FROM node:24.9.0-bookworm-slim AS base
WORKDIR /opt/sigi
RUN npm install --global pnpm@10.33.0

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
# Full install: the start script migrates through tsx before serving.
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 SIGI_DATA_DIR=/opt/sigi/data
COPY --from=deps /opt/sigi/node_modules ./node_modules
COPY . .
COPY --from=build /opt/sigi/.next ./.next
RUN mkdir -p /opt/sigi/data && chown node:node /opt/sigi/data
USER node
EXPOSE 3220
ENTRYPOINT ["sh", "scripts/container-start.sh"]
