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

RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
