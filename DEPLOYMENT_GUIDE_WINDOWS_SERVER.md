# Invitees Application - Windows Server 2019+ Deployment Guide

## Domain: https://invitees.barrancocairo.com

---

## Table of Contents
1. [Application Overview](#1-application-overview)
2. [Prerequisites & Requirements](#2-prerequisites--requirements)
3. [Server Setup](#3-server-setup)
4. [Install Required Software](#4-install-required-software)
5. [PostgreSQL Setup](#5-postgresql-setup)
6. [Backend Deployment](#6-backend-deployment)
7. [Frontend Deployment](#7-frontend-deployment)
8. [IIS Configuration](#8-iis-configuration)
9. [GoDaddy DNS Configuration](#9-godaddy-dns-configuration)
10. [SSL Certificate Setup](#10-ssl-certificate-setup)
11. [Windows Service for Flask](#11-windows-service-for-flask)
12. [Environment Variables](#12-environment-variables)
13. [Firewall Configuration](#13-firewall-configuration)
14. [Starting the Application](#14-starting-the-application)
15. [Updating & Maintenance](#15-updating--maintenance)
16. [Troubleshooting](#16-troubleshooting)
17. [Security Checklist](#17-security-checklist)
18. [Backup Strategy](#18-backup-strategy)

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
| **Web Server** | IIS (Internet Information Services) | 10.0 |
| **Process Manager** | NSSM (Non-Sucking Service Manager) | Latest |

### Target Domain
```
https://invitees.barrancocairo.com
```

### Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │           Windows Server 2019+              │
                    │                                             │
Internet ──────────▶│  ┌─────────┐    ┌──────────────────────┐   │
    HTTPS (443)     │  │   IIS   │───▶│  Waitress (Flask)    │   │
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

---

## 2. Prerequisites & Requirements

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 4 GB | 8 GB |
| **CPU** | 2 vCPU | 4 vCPU |
| **Storage** | 40 GB SSD | 80 GB SSD |
| **OS** | Windows Server 2019 | Windows Server 2022 |
| **Python** | 3.10+ | 3.12 |
| **Node.js** | 18+ | 20 LTS |
| **PostgreSQL** | 14+ | 16 |

### Required Software
1. Python 3.12+
2. Node.js 20 LTS
3. PostgreSQL 16
4. Git for Windows
5. IIS with URL Rewrite Module
6. NSSM (Non-Sucking Service Manager)

---

## 3. Server Setup

### Step 3.1: Initial Windows Server Configuration

1. **Connect to your Windows Server via RDP**
   - Use Remote Desktop Connection
   - Connect with Administrator credentials

2. **Set Server Hostname** (Optional but recommended)
   ```powershell
   # Run PowerShell as Administrator
   Rename-Computer -NewName "INVITEES-SERVER" -Restart
   ```

3. **Configure Windows Updates**
   ```powershell
   # Check for updates
   Install-Module PSWindowsUpdate -Force
   Get-WindowsUpdate
   Install-WindowsUpdate -AcceptAll -AutoReboot
   ```

4. **Set Timezone**
   ```powershell
   Set-TimeZone -Id "Egypt Standard Time"
   ```

---

## 4. Install Required Software

### Step 4.1: Install IIS (Internet Information Services)

```powershell
# Run PowerShell as Administrator

# Install IIS with required features
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Asp-Net45
Install-WindowsFeature -Name Web-Net-Ext45
Install-WindowsFeature -Name Web-ISAPI-Ext
Install-WindowsFeature -Name Web-ISAPI-Filter
Install-WindowsFeature -Name Web-Mgmt-Console
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-WebSockets

# Verify IIS is installed
Get-WindowsFeature -Name Web-*
```

### Step 4.2: Install URL Rewrite Module for IIS

1. Download from: https://www.iis.net/downloads/microsoft/url-rewrite
2. Or use PowerShell:
   ```powershell
   # Download and install URL Rewrite
   $url = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
   $output = "$env:TEMP\rewrite_amd64.msi"
   Invoke-WebRequest -Uri $url -OutFile $output
   Start-Process msiexec.exe -Wait -ArgumentList "/i $output /quiet"
   ```

### Step 4.3: Install Application Request Routing (ARR)

```powershell
# Download and install ARR
$url = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
$output = "$env:TEMP\arr_amd64.msi"
Invoke-WebRequest -Uri $url -OutFile $output
Start-Process msiexec.exe -Wait -ArgumentList "/i $output /quiet"

# Restart IIS
iisreset
```

### Step 4.4: Install Python 3.12

1. Download Python 3.12 from https://www.python.org/downloads/
2. **IMPORTANT**: During installation, check:
   - ☑️ "Add Python to PATH"
   - ☑️ "Install for all users"
3. Or use PowerShell:
   ```powershell
   # Download Python installer
   $pythonUrl = "https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe"
   $pythonInstaller = "$env:TEMP\python-3.12.0-amd64.exe"
   Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller
   
   # Install Python silently
   Start-Process -Wait -FilePath $pythonInstaller -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0'
   
   # Verify installation (open new PowerShell window)
   python --version
   pip --version
   ```

### Step 4.5: Install Node.js 20 LTS

1. Download from https://nodejs.org/
2. Or use PowerShell:
   ```powershell
   # Download Node.js installer
   $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
   $nodeInstaller = "$env:TEMP\node-v20.11.0-x64.msi"
   Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
   
   # Install Node.js
   Start-Process msiexec.exe -Wait -ArgumentList "/i $nodeInstaller /quiet"
   
   # Verify (open new PowerShell window)
   node --version
   npm --version
   ```

### Step 4.6: Install Git for Windows

```powershell
# Download Git installer
$gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
$gitInstaller = "$env:TEMP\Git-2.43.0-64-bit.exe"
Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller

# Install Git silently
Start-Process -Wait -FilePath $gitInstaller -ArgumentList '/VERYSILENT /NORESTART'

# Verify (open new PowerShell window)
git --version
```

### Step 4.7: Install NSSM (Non-Sucking Service Manager)

```powershell
# Create tools directory
New-Item -ItemType Directory -Force -Path "C:\Tools"

# Download NSSM
$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
$nssmZip = "$env:TEMP\nssm.zip"
Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip

# Extract NSSM
Expand-Archive -Path $nssmZip -DestinationPath "C:\Tools" -Force

# Copy to accessible location
Copy-Item "C:\Tools\nssm-2.24\win64\nssm.exe" "C:\Tools\nssm.exe"

# Add to PATH
$env:Path += ";C:\Tools"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Tools", [EnvironmentVariableTarget]::Machine)

# Verify
nssm version
```

---

## 5. PostgreSQL Setup

### Step 5.1: Install PostgreSQL

1. Download PostgreSQL 16 from https://www.postgresql.org/download/windows/
2. Run the installer and:
   - Select all components
   - Set a strong password for the `postgres` user
   - Keep default port: `5432`
   - Select default locale

Or use PowerShell:
```powershell
# Download PostgreSQL installer
$pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64.exe"
$pgInstaller = "$env:TEMP\postgresql-16.1-1-windows-x64.exe"
Invoke-WebRequest -Uri $pgUrl -OutFile $pgInstaller

# Run installer (interactive mode recommended for first time)
Start-Process -Wait -FilePath $pgInstaller
```

### Step 5.2: Configure PostgreSQL

Open **pgAdmin** or **SQL Shell (psql)** and run:

```sql
-- Create database
CREATE DATABASE invitees_db;

-- Create user with password
CREATE USER invitees_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE invitees_db TO invitees_user;

-- Connect to the database
\c invitees_db

-- Grant schema permissions (PostgreSQL 15+ requirement)
GRANT ALL ON SCHEMA public TO invitees_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invitees_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO invitees_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO invitees_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO invitees_user;

-- Exit
\q
```

### Step 5.3: Configure PostgreSQL for Local Connections

Edit `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`:

Find and modify:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
```

Restart PostgreSQL service:
```powershell
Restart-Service postgresql-x64-16
```

### Step 5.4: Test Database Connection

```powershell
# Using psql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U invitees_user -d invitees_db
# Enter password when prompted
```

---

## 6. Backend Deployment

### Step 6.1: Create Application Directory

```powershell
# Create directory structure
New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\invitees"
New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\invitees\backend"
New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\invitees\frontend"
New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\invitees\logs"
```

### Step 6.2: Clone/Upload Application Code

**Option A: Using Git**
```powershell
cd C:\inetpub\wwwroot\invitees
git clone https://github.com/yourusername/invitees.git .
```

**Option B: Copy from Local Machine**
```powershell
# From your local machine, use SCP or copy via RDP
# Copy the entire project folder to C:\inetpub\wwwroot\invitees\
```

### Step 6.3: Set Up Python Virtual Environment

```powershell
cd C:\inetpub\wwwroot\invitees\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Install Waitress (Windows-compatible WSGI server)
pip install waitress
```

### Step 6.4: Create Production Environment File

Create `C:\inetpub\wwwroot\invitees\backend\.env`:

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

# CORS - Your domain
CORS_ORIGINS=https://invitees.barrancocairo.com

# Upload Configuration
UPLOAD_FOLDER=C:\inetpub\wwwroot\invitees\backend\uploads
MAX_CONTENT_LENGTH=10485760
```

**Generate a secure SECRET_KEY:**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 6.5: Initialize Database

```powershell
cd C:\inetpub\wwwroot\invitees\backend
.\venv\Scripts\Activate.ps1

# Run database migrations
flask db upgrade

# Seed initial data (creates admin user)
python seed.py
```

**Default admin credentials (change immediately!):**
- Username: `admin`
- Password: `Admin@123`

### Step 6.6: Create Uploads Directory

```powershell
New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\invitees\backend\uploads"
```

### Step 6.7: Create Waitress Startup Script

Create `C:\inetpub\wwwroot\invitees\backend\run_waitress.py`:

```python
from waitress import serve
from app import create_app

app = create_app()

if __name__ == '__main__':
    print("Starting Invitees API with Waitress on port 5000...")
    serve(app, host='127.0.0.1', port=5000, threads=4)
```

### Step 6.8: Test Backend Manually

```powershell
cd C:\inetpub\wwwroot\invitees\backend
.\venv\Scripts\Activate.ps1

# Test with Waitress
python run_waitress.py

# In another PowerShell window, test:
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing
# Should return: {"status": "healthy"}

# Stop with Ctrl+C
```

---

## 7. Frontend Deployment

### Step 7.1: Build Frontend for Production

```powershell
cd C:\inetpub\wwwroot\invitees\frontend

# Install Node dependencies
npm install

# Create production build
npm run build
```

This creates a `dist\` directory with optimized static files.

### Step 7.2: Verify Build Output

```powershell
Get-ChildItem C:\inetpub\wwwroot\invitees\frontend\dist\
# Should contain:
# - index.html
# - assets\ (JS, CSS files)
```

---

## 8. IIS Configuration

### Step 8.1: Enable IIS Proxy

```powershell
# Enable ARR proxy
$adminManager = New-Object Microsoft.Web.Administration.ServerManager
$config = $adminManager.GetApplicationHostConfiguration()
$proxySection = $config.GetSection("system.webServer/proxy")
$proxySection.SetAttributeValue("enabled", $true)
$adminManager.CommitChanges()

# Or via IIS Manager:
# 1. Open IIS Manager
# 2. Click on server name
# 3. Double-click "Application Request Routing Cache"
# 4. Click "Server Proxy Settings" in Actions pane
# 5. Check "Enable proxy" and click Apply
```

### Step 8.2: Create IIS Website

```powershell
# Import IIS module
Import-Module WebAdministration

# Remove default website (optional)
Remove-WebSite -Name "Default Web Site"

# Create application pool
New-WebAppPool -Name "InviteesAppPool"
Set-ItemProperty "IIS:\AppPools\InviteesAppPool" -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty "IIS:\AppPools\InviteesAppPool" -Name "startMode" -Value "AlwaysRunning"

# Create website
New-WebSite -Name "Invitees" `
    -Port 80 `
    -PhysicalPath "C:\inetpub\wwwroot\invitees\frontend\dist" `
    -ApplicationPool "InviteesAppPool" `
    -HostHeader "invitees.barrancocairo.com"

# Add HTTPS binding (after SSL certificate is installed)
# New-WebBinding -Name "Invitees" -Protocol "https" -Port 443 -HostHeader "invitees.barrancocairo.com" -SslFlags 1
```

### Step 8.3: Create URL Rewrite Rules

Create `C:\inetpub\wwwroot\invitees\frontend\dist\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Proxy Rule - Forward /api requests to Flask backend -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:5000/api/{R:1}" />
                </rule>
                
                <!-- Health Check Proxy -->
                <rule name="Health Proxy" stopProcessing="true">
                    <match url="^health$" />
                    <action type="Rewrite" url="http://127.0.0.1:5000/health" />
                </rule>
                
                <!-- React SPA - Handle client-side routing -->
                <rule name="React Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                        <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
        
        <!-- Enable response buffering for proxy -->
        <proxy enabled="true" preserveHostHeader="true" />
        
        <!-- Static content caching -->
        <staticContent>
            <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
            <mimeMap fileExtension=".webp" mimeType="image/webp" />
        </staticContent>
        
        <!-- Security headers -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>
        
        <!-- Compression -->
        <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    </system.webServer>
</configuration>
```

### Step 8.4: Set Folder Permissions

```powershell
# Grant IIS_IUSRS read access to frontend
$acl = Get-Acl "C:\inetpub\wwwroot\invitees\frontend\dist"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl "C:\inetpub\wwwroot\invitees\frontend\dist" $acl

# Grant write access to uploads folder
$acl = Get-Acl "C:\inetpub\wwwroot\invitees\backend\uploads"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl "C:\inetpub\wwwroot\invitees\backend\uploads" $acl
```

---

## 9. GoDaddy DNS Configuration

### Step 9.1: Get Your Server's Public IP

```powershell
# Get public IP
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
```

### Step 9.2: Configure DNS in GoDaddy

1. Log into your **GoDaddy Account**
2. Go to **My Products** → Find **barrancocairo.com**
3. Click **DNS** or **Manage DNS**

4. Add/Edit the following DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | invitees | YOUR_SERVER_IP (e.g., 123.45.67.89) | 600 |

**Example:**
```
Type: A
Name: invitees
Value: 123.45.67.89
TTL: 600 seconds
```

### Step 9.3: Verify DNS Propagation

Wait 15-30 minutes for DNS propagation, then verify:

```powershell
# From any machine
nslookup invitees.barrancocairo.com
# Should return your server's IP address

# Or use online tool: https://dnschecker.org
```

---

## 10. SSL Certificate Setup

### Option A: Using Win-ACME (Let's Encrypt) - Recommended

#### Step 10.1: Download Win-ACME

```powershell
# Create directory
New-Item -ItemType Directory -Force -Path "C:\Tools\win-acme"

# Download Win-ACME
$winAcmeUrl = "https://github.com/win-acme/win-acme/releases/download/v2.2.8.1/win-acme.v2.2.8.1.x64.pluggable.zip"
$winAcmeZip = "$env:TEMP\win-acme.zip"
Invoke-WebRequest -Uri $winAcmeUrl -OutFile $winAcmeZip

# Extract
Expand-Archive -Path $winAcmeZip -DestinationPath "C:\Tools\win-acme" -Force
```

#### Step 10.2: Run Win-ACME

```powershell
cd C:\Tools\win-acme
.\wacs.exe
```

Follow the prompts:
1. Select `N` - Create certificate (default settings)
2. Select `1` - Single binding of an IIS site
3. Select your "Invitees" website
4. Enter email for notifications
5. Accept terms

Win-ACME will:
- Obtain SSL certificate from Let's Encrypt
- Configure IIS HTTPS binding
- Set up automatic renewal

#### Step 10.3: Verify HTTPS Binding

```powershell
# Check IIS bindings
Get-WebBinding -Name "Invitees"
# Should show both HTTP (80) and HTTPS (443) bindings
```

### Option B: Using GoDaddy SSL Certificate

If you have an SSL certificate from GoDaddy:

1. Export certificate as PFX file
2. Import to Windows Certificate Store:
   ```powershell
   Import-PfxCertificate -FilePath "C:\path\to\certificate.pfx" -CertStoreLocation Cert:\LocalMachine\My -Password (ConvertTo-SecureString -String "pfx-password" -AsPlainText -Force)
   ```
3. Bind in IIS Manager

---

## 11. Windows Service for Flask

### Step 11.1: Create Windows Service with NSSM

```powershell
# Install Flask as Windows service
nssm install InviteesAPI "C:\inetpub\wwwroot\invitees\backend\venv\Scripts\python.exe" "C:\inetpub\wwwroot\invitees\backend\run_waitress.py"

# Configure service
nssm set InviteesAPI AppDirectory "C:\inetpub\wwwroot\invitees\backend"
nssm set InviteesAPI DisplayName "Invitees API Service"
nssm set InviteesAPI Description "Flask API backend for Invitees application"
nssm set InviteesAPI Start SERVICE_AUTO_START

# Configure logging
nssm set InviteesAPI AppStdout "C:\inetpub\wwwroot\invitees\logs\api_stdout.log"
nssm set InviteesAPI AppStderr "C:\inetpub\wwwroot\invitees\logs\api_stderr.log"
nssm set InviteesAPI AppRotateFiles 1
nssm set InviteesAPI AppRotateBytes 10485760

# Set recovery options
nssm set InviteesAPI AppExit Default Restart
nssm set InviteesAPI AppRestartDelay 10000

# Start the service
nssm start InviteesAPI
```

### Step 11.2: Verify Service is Running

```powershell
# Check service status
Get-Service InviteesAPI

# Or
nssm status InviteesAPI

# Test API
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing
```

### Step 11.3: Service Management Commands

```powershell
# Stop service
nssm stop InviteesAPI

# Start service
nssm start InviteesAPI

# Restart service
nssm restart InviteesAPI

# View service configuration
nssm edit InviteesAPI

# Remove service (if needed)
nssm remove InviteesAPI confirm
```

---

## 12. Environment Variables

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
| `CORS_ORIGINS` | Allowed origins | `https://invitees.barrancocairo.com` | Yes |
| `UPLOAD_FOLDER` | File upload directory | `C:\...\uploads` | No |
| `MAX_CONTENT_LENGTH` | Max upload size (bytes) | `10485760` | No |

---

## 13. Firewall Configuration

### Step 13.1: Configure Windows Firewall

```powershell
# Allow HTTP (port 80)
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS (port 443)
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Block direct access to Flask (only allow localhost)
# This is already configured by binding Flask to 127.0.0.1

# Verify rules
Get-NetFirewallRule -DisplayName "HTTP*" | Format-Table
Get-NetFirewallRule -DisplayName "HTTPS*" | Format-Table
```

### Step 13.2: Block Unnecessary Ports

```powershell
# PostgreSQL should only accept local connections (default)
# Verify PostgreSQL is not exposed externally
Test-NetConnection -ComputerName localhost -Port 5432
```

---

## 14. Starting the Application

### Step 14.1: Start All Services

```powershell
# Start PostgreSQL (usually auto-starts)
Start-Service postgresql-x64-16

# Start Flask API service
nssm start InviteesAPI

# Start IIS
iisreset /start

# Or restart IIS
iisreset
```

### Step 14.2: Verify Everything is Running

```powershell
# Check PostgreSQL
Get-Service postgresql-x64-16

# Check Flask API
Get-Service InviteesAPI
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing

# Check IIS
Get-Service W3SVC

# Test public access
Invoke-WebRequest -Uri "https://invitees.barrancocairo.com/health" -UseBasicParsing
```

### Step 14.3: Enable Auto-Start on Boot

```powershell
# All services should be set to automatic, but verify:
Set-Service postgresql-x64-16 -StartupType Automatic
Set-Service InviteesAPI -StartupType Automatic
Set-Service W3SVC -StartupType Automatic
```

---

## 15. Updating & Maintenance

### 15.1: Standard Update Procedure

```powershell
# Navigate to project
cd C:\inetpub\wwwroot\invitees

# Pull latest code
git pull origin main

# Update backend
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask db upgrade
deactivate

# Update frontend
cd ..\frontend
npm install
npm run build

# Restart Flask service
nssm restart InviteesAPI

# Verify
Invoke-WebRequest -Uri "https://invitees.barrancocairo.com/health" -UseBasicParsing
```

### 15.2: Quick Update Script

Create `C:\inetpub\wwwroot\invitees\deploy.ps1`:

```powershell
# Invitees Deployment Script for Windows Server
Write-Host "=== Invitees Deployment Script ===" -ForegroundColor Cyan

Set-Location C:\inetpub\wwwroot\invitees

Write-Host "1. Pulling latest code..." -ForegroundColor Yellow
git pull origin main

Write-Host "2. Updating backend..." -ForegroundColor Yellow
Set-Location backend
& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask db upgrade
deactivate

Write-Host "3. Updating frontend..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install
npm run build

Write-Host "4. Restarting services..." -ForegroundColor Yellow
nssm restart InviteesAPI

Write-Host "5. Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "https://invitees.barrancocairo.com/health" -UseBasicParsing
    Write-Host "Health check: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
```

Run with:
```powershell
.\deploy.ps1
```

---

## 16. Troubleshooting

### 16.1: Common Issues and Solutions

#### Flask API Not Starting

```powershell
# Check service status
nssm status InviteesAPI

# View logs
Get-Content C:\inetpub\wwwroot\invitees\logs\api_stderr.log -Tail 50

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Python import errors
```

#### 502 Bad Gateway

```powershell
# Check if Flask is running
Test-NetConnection -ComputerName localhost -Port 5000

# Check service
Get-Service InviteesAPI

# Restart service
nssm restart InviteesAPI
```

#### Database Connection Errors

```powershell
# Check PostgreSQL is running
Get-Service postgresql-x64-16

# Test connection
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U invitees_user -d invitees_db

# Check pg_hba.conf if authentication fails
notepad "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
```

#### SSL Certificate Issues

```powershell
# Check certificate binding
Get-WebBinding -Name "Invitees"

# Check certificate
Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -like "*barrancocairo*" }

# Renew with Win-ACME
C:\Tools\win-acme\wacs.exe --renew --force
```

### 16.2: Useful Commands Reference

```powershell
# Restart services
nssm restart InviteesAPI
iisreset
Restart-Service postgresql-x64-16

# View logs
Get-Content C:\inetpub\wwwroot\invitees\logs\api_stdout.log -Tail 100
Get-Content C:\inetpub\logs\LogFiles\W3SVC1\*.log -Tail 100

# Check running processes
Get-Process | Where-Object { $_.ProcessName -like "*python*" }
Get-Process | Where-Object { $_.ProcessName -like "*w3wp*" }

# Check disk space
Get-PSDrive C

# Check memory
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10
```

---

## 17. Security Checklist

### Pre-Deployment Checklist

- [ ] Changed default admin password
- [ ] Generated strong SECRET_KEY
- [ ] Set SESSION_COOKIE_SECURE=True
- [ ] Configured proper CORS_ORIGINS (only your domain)
- [ ] Enabled Windows Firewall
- [ ] Only ports 80 and 443 are open
- [ ] PostgreSQL only accepts local connections
- [ ] Installed and configured SSL certificate
- [ ] Disabled unnecessary Windows features

### Post-Deployment Checklist

- [ ] Test login/logout functionality
- [ ] Verify HTTPS is working
- [ ] Check all API endpoints are secured
- [ ] Confirm file upload works and is limited
- [ ] Review application logs for errors

### Ongoing Security

- [ ] Keep Windows Server updated
- [ ] Monitor SSL certificate expiry
- [ ] Review IIS logs periodically
- [ ] Rotate database password annually
- [ ] Keep Python/Node.js dependencies updated

---

## 18. Backup Strategy

### 18.1: Database Backups

**Manual Backup:**
```powershell
# Create backup directory
New-Item -ItemType Directory -Force -Path "C:\Backups\invitees"

# Backup database
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U invitees_user -d invitees_db > "C:\Backups\invitees\db_$timestamp.sql"
```

**Restore from Backup:**
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U invitees_user -d invitees_db < "C:\Backups\invitees\db_20260202_120000.sql"
```

### 18.2: Automated Daily Backups

Create `C:\Scripts\backup-invitees.ps1`:

```powershell
$BackupDir = "C:\Backups\invitees"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RetentionDays = 30

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Set PostgreSQL password
$env:PGPASSWORD = "YourStrongPassword123!"

# Database backup
$dbBackup = "$BackupDir\db_$Timestamp.sql"
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U invitees_user -d invitees_db > $dbBackup

# Compress backup
Compress-Archive -Path $dbBackup -DestinationPath "$dbBackup.zip" -Force
Remove-Item $dbBackup

# Delete old backups
Get-ChildItem $BackupDir -Filter "db_*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item

Write-Host "Backup completed: $dbBackup.zip"
```

**Schedule with Task Scheduler:**
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File C:\Scripts\backup-invitees.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "Invitees Database Backup" -Action $action -Trigger $trigger -Principal $principal
```

### 18.3: Application Files Backup

```powershell
# Backup application files
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Compress-Archive -Path "C:\inetpub\wwwroot\invitees" -DestinationPath "C:\Backups\invitees\app_$timestamp.zip"
```

---

## Quick Reference

### Service Commands

| Action | Command |
|--------|---------|
| Start API | `nssm start InviteesAPI` |
| Stop API | `nssm stop InviteesAPI` |
| Restart API | `nssm restart InviteesAPI` |
| Check API status | `nssm status InviteesAPI` |
| Restart IIS | `iisreset` |
| Start PostgreSQL | `Start-Service postgresql-x64-16` |

### Important Paths

| Item | Path |
|------|------|
| Application | `C:\inetpub\wwwroot\invitees` |
| Backend | `C:\inetpub\wwwroot\invitees\backend` |
| Frontend Build | `C:\inetpub\wwwroot\invitees\frontend\dist` |
| Logs | `C:\inetpub\wwwroot\invitees\logs` |
| IIS Logs | `C:\inetpub\logs\LogFiles\W3SVC1` |
| Backups | `C:\Backups\invitees` |
| PostgreSQL | `C:\Program Files\PostgreSQL\16` |

### URLs

| Environment | URL |
|-------------|-----|
| Production | https://invitees.barrancocairo.com |
| Health Check | https://invitees.barrancocairo.com/health |
| API | https://invitees.barrancocairo.com/api/* |

---

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Target Domain:** https://invitees.barrancocairo.com
