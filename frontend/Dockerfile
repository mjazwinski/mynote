# syntax=docker/dockerfile:1

# ---- build stage: compile the React/Vite app into static files ----
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage: nginx (non-root) serves the SPA and proxies /api to the backend ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Rendered at container start by the image's envsubst entrypoint into /etc/nginx/conf.d/
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Backend base URL without trailing slash (Compose service name by default).
ENV BACKEND_URL=http://backend:8000

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
