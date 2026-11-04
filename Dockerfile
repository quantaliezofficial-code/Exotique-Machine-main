# ------------------------------------------------------------------ build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

# ------------------------------------------------------------------ serve
FROM nginx:1.27-alpine
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
# Unmodified shell for the backend's SEO renderer (fetched over the Docker network).
COPY --from=builder /app/dist/index.html /usr/share/nginx/html/_shell/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/ /etc/nginx/snippets/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/logo-80.png || exit 1
CMD ["nginx", "-g", "daemon off;"]
