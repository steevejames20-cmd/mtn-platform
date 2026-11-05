# syntax=docker/dockerfile:1.7

# Étape 1 : dépendances de production + client Prisma généré
FROM node:20.18.0-alpine3.20 AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
RUN node_modules/.bin/prisma generate

# Étape 2 : image finale, non-root
FROM node:20.18.0-alpine3.20 AS runtime
ENV NODE_ENV=production \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1
RUN apk add --no-cache openssl tzdata
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
# Protection contre les fins de ligne Windows (CRLF) dans le script
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER node
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
