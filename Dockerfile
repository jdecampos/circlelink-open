# syntax=docker/dockerfile:1
# Image de production de CircleLink, construite par Coolify.
# Le build n'a besoin ni de la base, ni d'aucun secret, ni de l'URL du site : tout est lu
# à l'exécution, une même image sert n'importe quel domaine (constitution VII.3).

FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Scripts du conteneur empaquetés, chacun en un seul fichier (sans node_modules)
RUN pnpm build \
 && pnpm exec esbuild scripts/db/migrate.ts scripts/db/reset-password.ts --bundle --platform=node --format=esm \
      --target=node22 --outdir=dist-scripts --out-extension:.js=.mjs \
      --banner:js="import{createRequire}from'node:module';const require=createRequire(import.meta.url);"

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/dist-scripts ./scripts
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
# Au démarrage : base créée si besoin, migrations, rôle applicatif ; le serveur ne part que si tout est prêt
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
