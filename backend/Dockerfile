# syntax=docker/dockerfile:1.7

# ---- Étape 1 : dépendances de production (couche mise en cache) ----
FROM node:20.18.0-alpine3.20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ---- Étape 2 : image finale, légère et non-root ----
FROM node:20.18.0-alpine3.20 AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 3000

CMD ["node", "server.js"]
