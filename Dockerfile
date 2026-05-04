# ─── Stage 1: Build React app ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .

RUN npm run build

# ─── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Copy built React files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config is mounted via docker-compose volumes (allows hot-swap without rebuild)
# nginx/conf.d/default.conf is mounted at runtime

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
