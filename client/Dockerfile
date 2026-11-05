# syntax=docker/dockerfile:1.7

# Étape 1 : build du site React (Vite)
FROM node:20.18.0-alpine3.20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# Étape 2 : Nginx non-root qui sert le site et relaie /api vers le backend
FROM nginxinc/nginx-unprivileged:1.27.2-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
