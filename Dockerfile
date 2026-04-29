# HyreLog Dashboard — Next.js standalone (see next.config.ts output: "standalone")
# Build (from hyrelog-dashboard repo root):
#   docker build -t hyrelog-dashboard:latest .
#
# Set runtime env in ECS (Secrets Manager / task definition). Do not bake .env.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js may not ship a /public directory in this repo; ensure it exists for COPY in runner
RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1
# `prisma generate` only needs a syntactically valid URL, not a live database.
ARG DATABASE_URL="postgresql://build:build@127.0.0.1:5432/dashboard_build?schema=public"
ENV DATABASE_URL=${DATABASE_URL}

# Build-time public URLs for Next (override via --build-arg in CI if needed)
ARG NEXT_PUBLIC_APP_URL="https://app.hyrelog.com"
ARG NEXT_PUBLIC_API_BASE_URL="https://api.hyrelog.com"
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ARG BETTER_AUTH_URL="https://app.hyrelog.com"
ARG BETTER_AUTH_SECRET="build-time-not-for-production"
ARG RESEND_API_KEY="build-time-not-for-production"
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV RESEND_API_KEY=${RESEND_API_KEY}

RUN npx prisma generate
RUN npm run build

# --- runtime: minimal standalone bundle ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next.config output: "standalone" — server.js and traced dependencies
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Schema + Prisma CLI for one-off ECS `prisma migrate deploy`.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
# Generated client is required by reset/seed scripts importing ../../generated/prisma/client.
COPY --from=build /app/generated ./generated

# Trust AWS RDS TLS: Node/pg need the RDS CA bundle alongside NODE_EXTRA_CA_CERTS.
#
# Standalone `.next` does not ship prisma.config.ts dependencies (`prisma/config`) or reset-script deps.
# Install Prisma CLI + reset-script runtime packages into /opt/prisma-cli and expose via NODE_PATH/PATH.
USER root
ARG PRISMA_MIGRATE_CLI_VERSION=7.7.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL -o /etc/ssl/certs/aws-rds-global-bundle.pem \
    https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  && chmod 644 /etc/ssl/certs/aws-rds-global-bundle.pem \
  && mkdir -p /opt/prisma-cli \
  && cd /opt/prisma-cli \
  && npm init -y \
  && npm install "prisma@${PRISMA_MIGRATE_CLI_VERSION}" "@prisma/adapter-pg" "pg" "tsx" "dotenv" --omit=dev --ignore-scripts \
  && chown -R node:node /opt/prisma-cli \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-global-bundle.pem
ENV NODE_PATH=/opt/prisma-cli/node_modules
ENV PATH="/opt/prisma-cli/node_modules/.bin:${PATH}"

RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
