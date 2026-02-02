# Invitees Application - Complete GoDaddy Deployment Guide

## Table of Contents
1. [Application Overview](#1-application-overview)
2. [Prerequisites & Requirements](#2-prerequisites--requirements)
3. [GoDaddy Hosting Options](#3-godaddy-hosting-options)
4. [Recommended Setup: VPS Hosting](#4-recommended-setup-vps-hosting)
5. [Step-by-Step Deployment](#5-step-by-step-deployment)
6. [Database Setup](#6-database-setup)
7. [Backend Deployment](#7-backend-deployment)
8. [Frontend Deployment](#8-frontend-deployment)
9. [Domain & SSL Configuration](#9-domain--ssl-configuration)
10. [Nginx Configuration](#10-nginx-configuration)
11. [Environment Variables](#11-environment-variables)
12. [Starting the Application](#12-starting-the-application)
13. [Updating & Maintenance](#13-updating--maintenance)
14. [Troubleshooting](#14-troubleshooting)
15. [Security Checklist](#15-security-checklist)
16. [Backup Strategy](#16-backup-strategy)

---

## 1. Application Overview

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Backend** | Flask (Python) | 3.0.0+ |
| **Database** | PostgreSQL | 14+ |
| **Frontend** | React + TypeScript | 18.2.0 |
| **Build Tool** | Vite | 5.0.8 |
| **CSS Framework** | TailwindCSS | 3.4.0 |
| **Web Server** | Nginx | Latest |
| **Process Manager** | Gunicorn + Supervisor | Latest |

### Application Structure

```
invitees/
├── backend/                    # Flask API Server
│   ├── app/
│   │   ├── __init__.py        # App factory
│   │   ├── config.py          # Configuration classes
│   │   ├── models/            # SQLAlchemy models (10 models)
│   │   ├── routes/            # API endpoints (16 route files)
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utility functions
│   ├── migrations/            # Alembic database migrations
│   ├── requirements.txt       # Python dependencies
│   ├── run.py                 # Development entry point
│   ├── seed.py                # Database seeding script
│   └── .env.example           # Environment template
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React contexts (Auth, Theme)
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   └── types/             # TypeScript definitions
│   ├── public/                # Static assets
│   ├── package.json           # Node dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── tailwind.config.js     # TailwindCSS config
│
└── DEPLOYMENT_GUIDE_GODADDY.md # This file
```

### Key Features
- User authentication with role-based access (Admin, Director, Organizer)
- Event management with check-in functionality
- Invitee management with approval workflow
- Real-time live dashboard
- PIN-based check-in console
- Excel import/export
- Activity logging and reports

---

## 2. Prerequisites & Requirements

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 2 GB | 4 GB |
| **CPU** | 1 vCPU | 2 vCPU |
| **Storage** | 20 GB SSD | 50 GB SSD |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **Python** | 3.10+ | 3.12 |
| **Node.js** | 18+ | 20 LTS |
| **PostgreSQL** | 14+ | 16 |

### Local Development Prerequisites
Before deploying, ensure you have:
- [ ] Git installed and configured
- [ ] SSH key pair generated
- [ ] Domain name purchased (via GoDaddy or elsewhere)
- [ ] Application tested locally and working
- [ ] All code committed to Git repository

### Required Accounts
1. **GoDaddy Account** - For VPS hosting
2. **GitHub/GitLab Account** - For code repository (optional but recommended)
3. **Domain** - Your custom domain (e.g., yourdomain.com)

---

## 3. GoDaddy Hosting Options

### Option Comparison

| Feature | Shared Hosting | VPS | Dedicated Server |
|---------|---------------|-----|------------------|
| **Flask Support** | ❌ Limited | ✅ Full | ✅ Full |
| **PostgreSQL** | ❌ MySQL only | ✅ Full | ✅ Full |
| **Root Access** | ❌ No | ✅ Yes | ✅ Yes |
| **Custom Ports** | ❌ No | ✅ Yes | ✅ Yes |
| **Price** | $5-15/mo | $20-80/mo | $100+/mo |
| **Scalability** | Low | Medium | High |
| **Recommendation** | ❌ Not suitable | ✅ **Best choice** | Overkill |

### Why VPS is Required

This application **cannot run on GoDaddy Shared Hosting** because:
1. Shared hosting only supports PHP/MySQL, not Python/PostgreSQL
2. No SSH/root access for installing dependencies
3. Cannot run Gunicorn/Supervisor processes
4. Cannot configure Nginx properly

**You MUST use GoDaddy VPS (Virtual Private Server) or a Dedicated Server.**

### GoDaddy VPS Plans

| Plan | RAM | vCPU | Storage | Price/mo |
|------|-----|------|---------|----------|
| **1 vCPU** | 2 GB | 1 | 40 GB SSD | ~$20 |
| **2 vCPU** | 4 GB | 2 | 60 GB SSD | ~$40 |
| **4 vCPU** | 8 GB | 4 | 100 GB SSD | ~$80 |

**Recommended: 2 vCPU plan** for production use with moderate traffic.

---

## 4. Recommended Setup: VPS Hosting

### Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              GoDaddy VPS                    │
                    │                                             │
Internet ──────────▶│  ┌─────────┐    ┌──────────────────────┐   │
    HTTPS (443)     │  │  Nginx  │───▶│  Gunicorn (Flask)    │   │
                    │  │         │    │  Port 5000           │   │
                    │  │ :80/:443│    └──────────┬───────────┘   │
                    │  │         │               │               │
                    │  │ Static  │    ┌──────────▼───────────┐   │
                    │  │ Files   │    │    PostgreSQL        │   │
                    │  │ (React) │    │    Port 5432         │   │
                    │  └─────────┘    └──────────────────────┘   │
                    │                                             │
                    └─────────────────────────────────────────────┘
```

### How It Works
1. **Nginx** serves as reverse proxy and static file server
2. **React app** (built) is served directly by Nginx as static files
3. **API requests** (`/api/*`) are proxied to Gunicorn
4. **Gunicorn** runs the Flask application with multiple workers
5. **Supervisor** keeps Gunicorn running and restarts on failure
6. **PostgreSQL** stores all application data

---

## 5. Step-by-Step Deployment

### Step 5.1: Purchase GoDaddy VPS

1. Go to [GoDaddy VPS Hosting](https://www.godaddy.com/hosting/vps-hosting)
2. Select **Self-Managed Linux VPS** (cheaper, full control)
3. Choose **Ubuntu 22.04 LTS** as the operating system
4. Select at least the **2 vCPU / 4 GB RAM** plan
5. Complete purchase and note your server IP address

### Step 5.2: Initial Server Access

After purchase, you'll receive:
- **IP Address**: e.g., `123.45.67.89`
- **Root Password**: Initial password (change immediately!)

**Connect via SSH:**
```bash
# From your local terminal (Windows: use PowerShell or Git Bash)
ssh root@123.45.67.89
# Enter the root password when prompted
```

### Step 5.3: Secure the Server (CRITICAL)

```bash
# Update system packages
apt update && apt upgrade -y

# Create a non-root user for daily operations
adduser deploy
usermod -aG sudo deploy

# Set up SSH key authentication (more secure than passwords)
# First, on your LOCAL machine, generate SSH keys if you don't have them:
# ssh-keygen -t ed25519 -C "your_email@example.com"

# Then copy your public key to the server:
# From LOCAL machine:
# ssh-copy-id deploy@123.45.67.89

# Or manually on server:
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# Paste your public key into authorized_keys
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Disable root login and password authentication (after confirming key works!)
nano /etc/ssh/sshd_config
# Change these lines:
# PermitRootLogin no
# PasswordAuthentication no

# Restart SSH
systemctl restart sshd

# Set up firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Step 5.4: Install Required Software

```bash
# Switch to deploy user
su - deploy

# Install Python 3.12
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev python3-pip

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Install Nginx
sudo apt install -y nginx

# Install Supervisor (process manager)
sudo apt install -y supervisor

# Install Git
sudo apt install -y git

# Verify installations
python3.12 --version  # Python 3.12.x
node --version        # v20.x.x
npm --version         # 10.x.x
psql --version        # 16.x
nginx -v              # nginx/1.x.x
```

---

## 6. Database Setup

### Step 6.1: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE invitees_db;
CREATE USER invitees_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE invitees_db TO invitees_user;

# Grant schema permissions (PostgreSQL 15+ requirement)
\c invitees_db
GRANT ALL ON SCHEMA public TO invitees_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invitees_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invitees_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO invitees_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO invitees_user;

# Exit
\q
```

### Step 6.2: Configure PostgreSQL Authentication

```bash
# Edit pg_hba.conf to allow password authentication
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Find the line for IPv4 local connections and change it to:
# host    all             all             127.0.0.1/32            scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -h localhost -U invitees_user -d invitees_db
# Enter password when prompted, then \q to exit
```

### Step 6.3: Database Connection String

Your database URL will be:
```
postgresql://invitees_user:YourStrongPassword123!@localhost:5432/invitees_db
```

---

## 7. Backend Deployment

### Step 7.1: Create Application Directory

```bash
# Create directory structure
sudo mkdir -p /var/www/invitees
sudo chown -R deploy:deploy /var/www/invitees
cd /var/www/invitees
```

### Step 7.2: Clone/Upload Application Code

**Option A: Using Git (Recommended)**
```bash
# If your code is on GitHub/GitLab
git clone https://github.com/yourusername/invitees.git .

# Or if private, set up deploy keys first
# Then pull
git pull origin main
```

**Option B: Using SCP (Direct Upload)**
```bash
# From your LOCAL machine (Windows PowerShell):
scp -r "D:\V3\invitees\*" deploy@123.45.67.89:/var/www/invitees/

# Or use FileZilla/WinSCP for GUI-based upload
```

### Step 7.3: Set Up Python Virtual Environment

```bash
cd /var/www/invitees/backend

# Create virtual environment with Python 3.12
python3.12 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Install Gunicorn (production WSGI server)
pip install gunicorn
```

### Step 7.4: Create Production Environment File

```bash
# Create .env file
nano /var/www/invitees/backend/.env
```

**Paste the following (modify values!):**
```env
# Flask Configuration
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=your-very-long-random-secret-key-at-least-32-characters

# Database Configuration
DATABASE_URL=postgresql://invitees_user:YourStrongPassword123!@localhost:5432/invitees_db

# Session Configuration
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
SESSION_COOKIE_SECURE=True
PERMANENT_SESSION_LIFETIME=1800

# Security
BCRYPT_LOG_ROUNDS=12

# CORS - Use your actual domain
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Upload Configuration
UPLOAD_FOLDER=/var/www/invitees/backend/uploads
MAX_CONTENT_LENGTH=10485760
```

**Generate a secure SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Step 7.5: Initialize Database

```bash
cd /var/www/invitees/backend
source venv/bin/activate

# Run database migrations
flask db upgrade

# Seed initial data (creates admin user)
python seed.py
```

**Note the default admin credentials (change immediately after first login!):**
- Username: `admin`
- Password: `Admin@123`

### Step 7.6: Create Uploads Directory

```bash
mkdir -p /var/www/invitees/backend/uploads
chmod 755 /var/www/invitees/backend/uploads
```

### Step 7.7: Test Backend Manually

```bash
cd /var/www/invitees/backend
source venv/bin/activate

# Test with Gunicorn
gunicorn --bind 127.0.0.1:5000 "app:create_app()"

# In another terminal, test:
curl http://127.0.0.1:5000/health
# Should return: {"status": "healthy"}

# Stop Gunicorn (Ctrl+C)
```

---

## 8. Frontend Deployment

### Step 8.1: Build Frontend for Production

```bash
cd /var/www/invitees/frontend

# Install Node dependencies
npm install

# Create production build
npm run build
```

This creates a `dist/` directory with optimized static files.

### Step 8.2: Configure API URL for Production

Before building, you may need to update the Vite config to handle production API URL.

**Create/Edit `/var/www/invitees/frontend/.env.production`:**
```env
VITE_API_URL=/api
```

The Nginx configuration will proxy `/api` requests to the Flask backend.

### Step 8.3: Verify Build Output

```bash
ls -la /var/www/invitees/frontend/dist/
# Should contain:
# - index.html
# - assets/ (JS, CSS files)
```

---

## 9. Domain & SSL Configuration

### Step 9.1: Point Domain to Server

**In GoDaddy DNS Management:**

1. Log into GoDaddy → **My Products** → **DNS** for your domain
2. Add/Edit the following records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 123.45.67.89 (your server IP) | 600 |
| A | www | 123.45.67.89 | 600 |
| CNAME | api | @ | 600 |

Wait 15-30 minutes for DNS propagation.

**Verify DNS:**
```bash
# From any terminal
nslookup yourdomain.com
# Should return your server IP
```

### Step 9.2: Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run
```

**Certbot automatically:**
- Obtains SSL certificate
- Configures Nginx for HTTPS
- Sets up auto-renewal (certificates expire every 90 days)

---

## 10. Nginx Configuration

### Step 10.1: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/invitees
```

**Paste the following configuration:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # Frontend - React SPA (static files)
    location / {
        root /var/www/invitees/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Gunicorn
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cookie $http_cookie;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # File upload limit
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/invitees_access.log;
    error_log /var/log/nginx/invitees_error.log;
}
```

### Step 10.2: Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/invitees /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
# Should say: syntax is ok, test is successful

# Reload Nginx
sudo systemctl reload nginx
```

---

## 11. Environment Variables

### Complete Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `FLASK_APP` | Flask application entry point | `run.py` | Yes |
| `FLASK_ENV` | Environment mode | `production` | Yes |
| `SECRET_KEY` | Session encryption key (32+ chars) | `a1b2c3d4...` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` | Yes |
| `SESSION_COOKIE_HTTPONLY` | Prevent JS access to cookies | `True` | Yes |
| `SESSION_COOKIE_SAMESITE` | CSRF protection | `Lax` | Yes |
| `SESSION_COOKIE_SECURE` | HTTPS-only cookies | `True` | Yes |
| `PERMANENT_SESSION_LIFETIME` | Session timeout (seconds) | `1800` | No |
| `BCRYPT_LOG_ROUNDS` | Password hashing rounds | `12` | No |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `https://yourdomain.com` | Yes |
| `UPLOAD_FOLDER` | File upload directory | `/var/www/.../uploads` | No |
| `MAX_CONTENT_LENGTH` | Max upload size (bytes) | `10485760` | No |

### Security Best Practices for Environment Variables

1. **Never commit `.env` to Git**
2. **Use strong, unique SECRET_KEY** (generate with `secrets.token_hex(32)`)
3. **Use strong database password** (20+ characters, mixed case, numbers, symbols)
4. **Restrict file permissions**: `chmod 600 .env`

---

## 12. Starting the Application

### Step 12.1: Create Gunicorn Configuration

```bash
nano /var/www/invitees/backend/gunicorn.conf.py
```

**Paste:**
```python
# Gunicorn configuration file

# Server socket
bind = '127.0.0.1:5000'
backlog = 2048

# Worker processes
workers = 3  # (2 x CPU cores) + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

# Process naming
proc_name = 'invitees'

# Logging
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
loglevel = 'info'

# Server mechanics
daemon = False
pidfile = '/var/run/gunicorn/invitees.pid'
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (handled by Nginx, not Gunicorn)
keyfile = None
certfile = None
```

### Step 12.2: Create Log Directories

```bash
sudo mkdir -p /var/log/gunicorn
sudo chown deploy:deploy /var/log/gunicorn
sudo mkdir -p /var/run/gunicorn
sudo chown deploy:deploy /var/run/gunicorn
```

### Step 12.3: Create Supervisor Configuration

```bash
sudo nano /etc/supervisor/conf.d/invitees.conf
```

**Paste:**
```ini
[program:invitees]
command=/var/www/invitees/backend/venv/bin/gunicorn --config /var/www/invitees/backend/gunicorn.conf.py "app:create_app()"
directory=/var/www/invitees/backend
user=deploy
numprocs=1
autostart=true
autorestart=true
startsecs=10
startretries=3
exitcodes=0,2
stopsignal=TERM
stopwaitsecs=10
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/invitees.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
environment=PATH="/var/www/invitees/backend/venv/bin"
```

### Step 12.4: Start Application

```bash
# Reload Supervisor configuration
sudo supervisorctl reread
sudo supervisorctl update

# Start the application
sudo supervisorctl start invitees

# Check status
sudo supervisorctl status invitees
# Should show: invitees RUNNING

# View logs
sudo tail -f /var/log/supervisor/invitees.log
```

### Step 12.5: Verify Everything is Running

```bash
# Check Nginx
sudo systemctl status nginx
# Should be active (running)

# Check Supervisor/Gunicorn
sudo supervisorctl status
# invitees should be RUNNING

# Check PostgreSQL
sudo systemctl status postgresql
# Should be active (running)

# Test API endpoint
curl https://yourdomain.com/health
# Should return: {"status": "healthy"}

# Test frontend
curl https://yourdomain.com
# Should return HTML content
```

### Step 12.6: Enable Auto-Start on Boot

```bash
# These should already be enabled, but verify:
sudo systemctl enable nginx
sudo systemctl enable postgresql
sudo systemctl enable supervisor
```

---

## 13. Updating & Maintenance

### 13.1: Standard Update Procedure

When you have code changes to deploy:

```bash
# SSH into server
ssh deploy@yourdomain.com

# Navigate to project
cd /var/www/invitees

# Pull latest code
git pull origin main

# Update backend dependencies (if changed)
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Run database migrations (if any)
flask db upgrade

# Deactivate virtual environment
deactivate

# Update frontend (if changed)
cd ../frontend
npm install
npm run build

# Restart backend
sudo supervisorctl restart invitees

# Verify
sudo supervisorctl status invitees
curl https://yourdomain.com/health
```

### 13.2: Quick Update Script

Create a deployment script for convenience:

```bash
nano /var/www/invitees/deploy.sh
```

**Paste:**
```bash
#!/bin/bash
set -e

echo "=== Invitees Deployment Script ==="
cd /var/www/invitees

echo "1. Pulling latest code..."
git pull origin main

echo "2. Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
deactivate

echo "3. Updating frontend..."
cd ../frontend
npm install
npm run build

echo "4. Restarting services..."
sudo supervisorctl restart invitees

echo "5. Verifying deployment..."
sleep 3
curl -s https://yourdomain.com/health

echo ""
echo "=== Deployment Complete ==="
```

**Make executable:**
```bash
chmod +x /var/www/invitees/deploy.sh
```

**Run updates with:**
```bash
./deploy.sh
```

### 13.3: Rollback Procedure

If an update causes issues:

```bash
# Check git log for previous good commit
cd /var/www/invitees
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash>

# Or rollback one commit
git reset --hard HEAD~1

# Rebuild frontend
cd frontend
npm run build

# Restart backend
sudo supervisorctl restart invitees
```

### 13.4: Database Migration Rollback

```bash
cd /var/www/invitees/backend
source venv/bin/activate

# View migration history
flask db history

# Downgrade one migration
flask db downgrade -1

# Or downgrade to specific revision
flask db downgrade <revision-id>
```

### 13.5: Zero-Downtime Deployment (Advanced)

For larger applications, consider:

1. **Blue-Green Deployment**: Run two instances, switch traffic
2. **Rolling Updates**: Update workers one at a time
3. **Feature Flags**: Deploy code but control feature availability

For this application size, the standard restart method (few seconds downtime) is acceptable.

---

## 14. Troubleshooting

### 14.1: Common Issues and Solutions

#### Application Not Starting

```bash
# Check Supervisor logs
sudo tail -100 /var/log/supervisor/invitees.log

# Check Gunicorn logs
sudo tail -100 /var/log/gunicorn/error.log

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Import errors in Python code
```

#### 502 Bad Gateway

```bash
# Check if Gunicorn is running
sudo supervisorctl status invitees

# If not running, check why
sudo supervisorctl start invitees
sudo tail -f /var/log/supervisor/invitees.log

# Common causes:
# - Gunicorn crashed
# - Wrong port in Nginx config
# - Socket permission issues
```

#### 500 Internal Server Error

```bash
# Check application logs
sudo tail -100 /var/log/supervisor/invitees.log

# Common causes:
# - Database errors
# - Missing migrations
# - Code bugs
```

#### Database Connection Errors

```bash
# Test database connection
psql -h localhost -U invitees_user -d invitees_db

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check pg_hba.conf if authentication fails
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

#### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually if needed
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

#### Permission Errors

```bash
# Fix ownership
sudo chown -R deploy:deploy /var/www/invitees

# Fix upload folder permissions
chmod 755 /var/www/invitees/backend/uploads
```

### 14.2: Useful Commands Reference

```bash
# Restart services
sudo supervisorctl restart invitees
sudo systemctl reload nginx
sudo systemctl restart postgresql

# View logs
sudo tail -f /var/log/supervisor/invitees.log    # App logs
sudo tail -f /var/log/nginx/invitees_access.log  # Access logs
sudo tail -f /var/log/nginx/invitees_error.log   # Nginx errors
sudo tail -f /var/log/gunicorn/error.log         # Gunicorn errors

# Check running processes
ps aux | grep gunicorn
ps aux | grep nginx
ps aux | grep postgres

# Check disk space
df -h

# Check memory
free -m

# Check CPU
top
```

---

## 15. Security Checklist

### Pre-Deployment Checklist

- [ ] Changed default admin password
- [ ] Generated strong SECRET_KEY
- [ ] Set SESSION_COOKIE_SECURE=True
- [ ] Configured proper CORS_ORIGINS (only your domain)
- [ ] Disabled root SSH login
- [ ] Set up SSH key authentication
- [ ] Enabled UFW firewall
- [ ] Installed and configured SSL certificate
- [ ] Removed default Nginx site

### Post-Deployment Checklist

- [ ] Test login/logout functionality
- [ ] Verify HTTPS is working
- [ ] Check all API endpoints are secured
- [ ] Confirm file upload works and is limited
- [ ] Review application logs for errors
- [ ] Set up log rotation

### Ongoing Security

- [ ] Keep Ubuntu packages updated: `sudo apt update && sudo apt upgrade`
- [ ] Monitor SSL certificate expiry (auto-renewed by Certbot)
- [ ] Review access logs periodically
- [ ] Rotate database password annually
- [ ] Keep dependencies updated

### Security Headers (Already in Nginx Config)

| Header | Purpose |
|--------|---------|
| X-Frame-Options | Prevents clickjacking |
| X-Content-Type-Options | Prevents MIME sniffing |
| X-XSS-Protection | XSS filtering |
| Referrer-Policy | Controls referrer information |

---

## 16. Backup Strategy

### 16.1: Database Backups

**Manual Backup:**
```bash
# Create backup
pg_dump -h localhost -U invitees_user -d invitees_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h localhost -U invitees_user -d invitees_db < backup_20260202_120000.sql
```

**Automated Daily Backups:**
```bash
# Create backup script
sudo nano /usr/local/bin/backup-invitees.sh
```

**Paste:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/invitees"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
PGPASSWORD="YourStrongPassword123!" pg_dump -h localhost -U invitees_user -d invitees_db > $BACKUP_DIR/db_$TIMESTAMP.sql

# Compress
gzip $BACKUP_DIR/db_$TIMESTAMP.sql

# Delete old backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Backup completed - db_$TIMESTAMP.sql.gz" >> /var/log/invitees-backup.log
```

**Make executable and schedule:**
```bash
sudo chmod +x /usr/local/bin/backup-invitees.sh

# Add to crontab (runs daily at 3 AM)
sudo crontab -e
# Add line:
0 3 * * * /usr/local/bin/backup-invitees.sh
```

### 16.2: Application Code Backup

Your code is already backed up in Git. To ensure you have local backups:

```bash
# On your local machine, always keep a cloned copy
git clone https://github.com/yourusername/invitees.git invitees-backup
```

### 16.3: Full Server Backup

GoDaddy VPS may offer snapshot/backup features in their control panel. Enable:
- Weekly server snapshots
- Keep at least 2-3 snapshots

### 16.4: Offsite Backup (Recommended)

For critical data, sync backups to external storage:

```bash
# Install rclone for cloud sync
sudo apt install rclone

# Configure for Google Drive, Dropbox, S3, etc.
rclone config

# Sync backups
rclone sync /var/backups/invitees remote:invitees-backups
```

---

## Quick Reference Card

### Server Access
```bash
ssh deploy@yourdomain.com
```

### Service Commands
```bash
sudo supervisorctl restart invitees  # Restart app
sudo systemctl reload nginx          # Reload Nginx
sudo systemctl restart postgresql    # Restart DB
```

### Deploy Updates
```bash
cd /var/www/invitees && ./deploy.sh
```

### View Logs
```bash
sudo tail -f /var/log/supervisor/invitees.log
```

### Database Access
```bash
psql -h localhost -U invitees_user -d invitees_db
```

### Check Status
```bash
sudo supervisorctl status
curl https://yourdomain.com/health
```

---

## Support and Resources

### GoDaddy Support
- **VPS Documentation**: https://www.godaddy.com/help/vps-hosting-41282
- **DNS Help**: https://www.godaddy.com/help/dns-42035
- **Support Phone**: 1-480-505-8877

### Technology Documentation
- **Flask**: https://flask.palletsprojects.com/
- **Nginx**: https://nginx.org/en/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Supervisor**: http://supervisord.org/

---

*Document Version: 1.0*
*Last Updated: February 2, 2026*
*Application Version: 1.0.0*
