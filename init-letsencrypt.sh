#!/bin/bash
# ─── SSL Certificate Initialization Script ────────────────────────────────────
# Run this ONCE on a fresh server before starting docker-compose.
# After this, certbot auto-renews every 12 hours inside the container.
#
# Usage:
#   chmod +x init-letsencrypt.sh
#   sudo bash init-letsencrypt.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

EMAIL="nodirbekshukurov382@gmail.com"
DOMAIN_FRONTEND="exambridge.uz"
DOMAIN_BACKEND="nodir.exambridge.uz"

# ── 1. Create shared Docker network ──────────────────────────────────────────
echo "▶ Creating shared Docker network exambridge_net..."
docker network create exambridge_net 2>/dev/null && echo "  Created." || echo "  Already exists, skipping."

# ── 2. Create dummy self-signed certs so nginx can start ─────────────────────
echo "▶ Creating temporary self-signed certificates..."

mkdir -p "./certbot_init/live/$DOMAIN_FRONTEND"
mkdir -p "./certbot_init/live/$DOMAIN_BACKEND"

openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "./certbot_init/live/$DOMAIN_FRONTEND/privkey.pem" \
  -out    "./certbot_init/live/$DOMAIN_FRONTEND/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null

openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "./certbot_init/live/$DOMAIN_BACKEND/privkey.pem" \
  -out    "./certbot_init/live/$DOMAIN_BACKEND/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null

# Copy dummy certs into certbot named volume
docker run --rm \
  -v sat_front_certbot_certs:/etc/letsencrypt \
  -v "$(pwd)/certbot_init:/src" \
  alpine sh -c "cp -r /src/live /etc/letsencrypt/"

rm -rf "./certbot_init"

# ── 3. Build and start nginx (with dummy certs) ───────────────────────────────
echo "▶ Building and starting nginx..."
docker-compose up -d --build nginx

echo "  Waiting for nginx to be ready..."
sleep 5

# ── 4. Obtain real Let's Encrypt certificate for exambridge.uz ────────────────
echo "▶ Obtaining SSL certificate for $DOMAIN_FRONTEND..."
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "$DOMAIN_FRONTEND" \
  -d "www.$DOMAIN_FRONTEND"

# ── 5. Obtain real Let's Encrypt certificate for nodir.exambridge.uz ──────────
echo "▶ Obtaining SSL certificate for $DOMAIN_BACKEND..."
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "$DOMAIN_BACKEND"

# ── 6. Reload nginx with real certs ───────────────────────────────────────────
echo "▶ Reloading nginx with real SSL certificates..."
docker-compose exec nginx nginx -s reload

# ── 7. Start certbot renewal daemon ───────────────────────────────────────────
echo "▶ Starting certbot renewal daemon..."
docker-compose up -d certbot

echo ""
echo "✅ SSL certificates issued successfully!"
echo "   https://exambridge.uz     → React frontend"
echo "   https://nodir.exambridge.uz → Django admin"
echo ""
echo "Auto-renewal is active — certbot checks every 12 hours."
