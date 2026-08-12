# ---- Dependencies ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm ci

# ---- Builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy values only for Next.js build-time page collection (runtime overrides these)
ENV DATABASE_URL="postgresql://aifood:aifood@localhost:5432/aifoodtracker?schema=public"
ENV AUTH_SECRET="build-time-auth-secret-aifoodtracker-32"
ENV AUTH_URL="http://localhost:3333"
ENV NEXTAUTH_URL="http://localhost:3333"
ENV ENCRYPTION_KEY="build-time-encryption-key-aifoodtracker"
RUN npx prisma generate
RUN npm run build

# ---- Runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y openssl ca-certificates gosu && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/public/uploads /app/uploads \
  && chown -R nextjs:nodejs /app/public /app/uploads
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Entrypoint runs as root to chown the uploads bind-mount, then drops to nextjs.
USER root
EXPOSE 3333
ENV PORT=3333
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/app/uploads

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
