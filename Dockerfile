# Multi-stage build using Next.js's standalone output (next.config.ts) - the runtime image
# carries only the traced production dependencies, not the full node_modules tree or source.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time, not read at runtime - must
# be passed as Docker build-args (see railway.toml) so the deployed build actually points at the
# right API. --max-old-space-size matches the local memory-constraint finding in DECISIONS.md;
# harmless headroom to set even on a build machine that doesn't need it.
ARG NEXT_PUBLIC_API_MODE
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NODE_OPTIONS="--max-old-space-size=3584"

# ARENA-STABILIZE.md Phase 0.2 - build stamp so a stale deploy is visible in 5 seconds
# (footer + /version). RAILWAY_GIT_COMMIT_SHA is auto-forwarded as a build arg by Railway's
# Dockerfile builder for git-connected services; falls back to "local" outside Railway.
ARG RAILWAY_GIT_COMMIT_SHA=local
RUN echo "NEXT_PUBLIC_BUILD_COMMIT=${RAILWAY_GIT_COMMIT_SHA}" >> .env.production.local && \
    echo "NEXT_PUBLIC_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .env.production.local
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
