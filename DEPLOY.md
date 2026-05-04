# sat_front — Deployment Guide

Server IP: `161.97.107.51`
Domain: `exambridge.uz` (also proxies `nodir.exambridge.uz` to backend)

---

## First-time server setup

```bash
# 1. Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

## Deploy (same server as backend)

### Step 1 — Clone and configure
```bash
git clone https://github.com/YOUR_USER/sat_front.git
cd sat_front
cp .env.example .env
# Edit .env with your Google client ID
nano .env
```

### Step 2 — Get SSL certificates (run once)
```bash
chmod +x init-letsencrypt.sh
sudo bash init-letsencrypt.sh
```
This will:
- Create the shared `exambridge_net` Docker network
- Build the nginx container with React app
- Get real Let's Encrypt certs for `exambridge.uz` AND `nodir.exambridge.uz`
- Set up auto-renewal (every 12h check, renews 30 days before expiry)

### Step 3 — Start everything
```bash
docker-compose up -d --build
```

### Step 4 — Deploy backend (from sat/ directory)
```bash
cd ../sat
docker-compose up -d --build
```

---

## Re-deploy after code changes
```bash
git pull
docker-compose up -d --build
```
Nginx reloads automatically every 6h for cert renewal.

## Useful commands
```bash
# View logs
docker-compose logs -f nginx
docker-compose logs -f certbot

# Force SSL renewal now
docker-compose exec certbot certbot renew --force-renewal

# Reload nginx (pick up new certs manually)
docker-compose exec nginx nginx -s reload

# Check running containers
docker-compose ps
```

---

## Architecture
```
Internet (port 80/443)
       │
   [nginx - sat_front]
       │
       ├── exambridge.uz        → /usr/share/nginx/html (React static)
       │       └── /api/        → proxy → web:8000 (Django)
       │       └── /media/      → proxy → web:8000 (Django)
       │
       └── nodir.exambridge.uz  → proxy → web:8000 (Django admin)
                                          │
                                    [exambridge_net]
                                          │
                              [web - Django/Gunicorn]
                              [db  - PostgreSQL]      ← data NEVER wiped
                              [redis]
                              [celery]
```
