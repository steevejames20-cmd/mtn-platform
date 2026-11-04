# Nginx non-root (écoute sur 8080, pas besoin de privilèges)
FROM nginxinc/nginx-unprivileged:1.27.2-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 8080
