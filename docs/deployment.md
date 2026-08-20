# NIVARAN-AI — Production Deployment & Operations Guide

## 1. Production Architecture Overview

In production, NIVARAN-AI is deployed using a containerized microservice or multi-process setup with Nginx reverse proxy, Gunicorn/Uvicorn ASGI backend, PostgreSQL database, and static React build hosting.

```text
                                Internet
                                   │
                             HTTPS (Port 443)
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │    Nginx Reverse Proxy  │
                      │  SSL Termination / Gzip │
                      └────────────┬────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            │                                             │
            ▼                                             ▼
    Static Files SPA                               API Proxy (Port 8000)
    (/var/www/nivaran/dist)                        (http://127.0.0.1:8000)
            │                                             │
            │                                             ▼
      React Frontend                                FastAPI (Gunicorn)
                                                          │
                                         ┌────────────────┴────────────────┐
                                         │                                 │
                                         ▼                                 ▼
                                PostgreSQL Database              Persistent File Storage
                                   (Port 5432)                   (/var/nivarandata/docs)
```

---

## 2. Environment Variables Checklist

### 2.1. Backend (`.env`)
```env
# DATABASE
DATABASE_URL=postgresql+psycopg2://nivaran_user:StrongPasswordHere@127.0.0.1:5432/nivaran_production_db

# SECURITY
SECRET_KEY=9f82c478a59b3846e4d58a1290f13b2849e0c65192847a6b104938572a1b9c0d
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# CORS
ALLOWED_ORIGINS=https://nivaran.csjmu.ac.in

# STORAGE
STORAGE_DIR=/var/nivarandata/storage/documents

# EMAIL / SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=research.redressal@csjmu.ac.in
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@csjmu.ac.in
SMTP_FROM_NAME=NIVARAN-AI CSJMU
SMTP_FROM=NIVARAN-AI <noreply@csjmu.ac.in>

# FRONTEND
FRONTEND_URL=https://nivaran.csjmu.ac.in
```

### 2.2. Frontend (`.env.production`)
```env
VITE_API_BASE_URL=https://nivaran.csjmu.ac.in/api/v1
```

---

## 3. Step-by-Step Deployment Guide

### Step 1: Database Provisioning & Migration
```bash
# Connect to PostgreSQL
sudo -u postgres psql
CREATE DATABASE nivaran_production_db;
CREATE USER nivaran_user WITH ENCRYPTED PASSWORD 'StrongPasswordHere';
GRANT ALL PRIVILEGES ON DATABASE nivaran_production_db TO nivaran_user;
\q

# Apply database migrations
cd /opt/nivaran-ai/backend
source venv/bin/activate
alembic upgrade head

# Seed initial academic hierarchy
python scripts/seed_categories.py
python scripts/seed_subjects.py
python scripts/seed_assistant_deans.py
python scripts/seed_associate_deans.py
python scripts/seed_category_routing.py
```

### Step 2: Backend Systemd Service Setup
Create `/etc/systemd/system/nivaran-backend.service`:
```ini
[Unit]
Description=NIVARAN-AI FastAPI Backend Service
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/nivaran-ai/backend
EnvironmentFile=/opt/nivaran-ai/backend/.env
ExecStart=/opt/nivaran-ai/backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/nivaran/backend_access.log \
    --error-logfile /var/log/nivaran/backend_error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable nivaran-backend
sudo systemctl start nivaran-backend
```

### Step 3: Frontend Build & Static Deployment
```bash
cd /opt/nivaran-ai/frontend
npm ci
npm run build
sudo mkdir -p /var/www/nivaran
sudo cp -r dist/* /var/www/nivaran/
```

### Step 4: Nginx Web Server Configuration
Create `/etc/nginx/sites-available/nivaran.conf`:
```nginx
server {
    listen 80;
    server_name nivaran.csjmu.ac.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nivaran.csjmu.ac.in;

    ssl_certificate /etc/letsencrypt/live/nivaran.csjmu.ac.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nivaran.csjmu.ac.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Maximum file upload size for grievance documents (25 MB)
    client_max_body_size 25M;

    # Static Frontend SPA
    location / {
        root /var/www/nivaran;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/nivaran.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 4. Background Reminder Cron Job
Add a cron job to trigger the 3-day inactivity check daily at 8:00 AM:
```bash
# Run crontab -e as application user
0 8 * * * /opt/nivaran-ai/backend/venv/bin/python /opt/nivaran-ai/backend/test_reminder.py >> /var/log/nivaran/reminder_cron.log 2>&1
```
