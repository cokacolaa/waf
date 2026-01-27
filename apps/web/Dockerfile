# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy app package files
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web

# Build the application
RUN pnpm --filter @nginx-love/web build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx config
COPY config/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8088
EXPOSE 8088

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8088/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
