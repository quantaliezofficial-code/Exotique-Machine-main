# ==========================================
# Stage 1: Build the React + Vite application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install clean dependencies
RUN npm ci

# Copy project source files and assets
COPY . .

# Run production build (TypeScript check + Vite compilation)
RUN npm run build

# ==========================================
# Stage 2: Serve using high-performance Nginx
# ==========================================
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled production bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing and compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check to ensure container is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
