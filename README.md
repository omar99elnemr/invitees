# Event Invitees Management System

A complete web application for managing event invitations with role-based access control, approval workflows, and comprehensive reporting.

## 🎯 Features

- **Role-Based Access Control**: Three user roles (Admin, Director, Organizer) with distinct permissions
- **Event Management**: Create and manage events with automatic status updates
- **Invitee Management**: Add invitees individually or via bulk Excel/CSV import
- **Approval Workflow**: Directors and Admins can approve/reject invitations
- **Comprehensive Reporting**: 4 different report types with Excel/CSV/PDF export
- **Audit Trail**: Complete logging of all system actions
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Technology Stack

### Backend
- **Framework**: Python Flask 3.x
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy
- **Authentication**: Flask-Login with bcrypt
- **API**: RESTful with Flask-CORS

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context API
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Forms**: React Hook Form with Yup validation
- **Tables**: TanStack Table v8
- **Exports**: SheetJS (xlsx), jsPDF, Papa Parse

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 15+** ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))

## 🚀 Installation Guide

### Step 1: Database Setup

#### Install PostgreSQL
1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, remember your PostgreSQL password
3. PostgreSQL will be accessible on `localhost:5432`

#### Create Database
Open PowerShell and run:

```powershell
# Access PostgreSQL (you'll be prompted for password)
psql -U postgres

# In PostgreSQL prompt, create database:
CREATE DATABASE invitees_db;

# Exit PostgreSQL
\q
```

### Step 2: Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
Copy-Item .env.example .env

# Edit .env file with your database credentials
notepad .env
```

**Edit the `.env` file:**
```env
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-very-secret-key-change-this

# Update with your PostgreSQL password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/invitees_db

SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
PERMANENT_SESSION_LIFETIME=1800

BCRYPT_LOG_ROUNDS=12
CORS_ORIGINS=http://localhost:5173

UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=10485760
```

#### Initialize Database

```powershell
# Run database migrations
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Seed database with initial data (creates admin user and sample data)
python seed.py
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `Admin@123`

⚠️ **IMPORTANT**: Change the admin password after first login!

#### Start Backend Server

```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate

# Start Flask server
python run.py
```

The backend will be running on `http://localhost:5000`

### Step 3: Frontend Setup

Open a **new PowerShell window**:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be running on `http://localhost:5173`

## 🎮 Usage

### First Time Setup

1. **Access the application**: Open your browser and go to `http://localhost:5173`

2. **Login with admin**:
   - Username: `admin`
   - Password: `Admin@123`

3. **Change admin password**:
   - Click on your profile (top right)
   - Select "Change Password"
   - Update to a secure password

4. **Create users**:
   - Go to "Users" menu
   - Click "Add User"
   - Create Director and Organizer accounts

5. **Create an event**:
   - Go to "Events" menu
   - Click "Create Event"
   - Fill in event details

6. **Add invitees**:
   - Select an event
   - Click "Add Invitee" (single) or "Bulk Import" (Excel/CSV)

### User Roles & Permissions

#### Organizer
- Add invitees to upcoming/ongoing events
- Submit invitations for approval
- View their own submissions

#### Director
- Everything Organizers can do, plus:
- Approve/reject invitations
- View and generate reports
- Access analytics dashboard

#### Admin
- Full system access
- Manage users and inviter groups
- Create/edit/delete events
- View ended events
- Access audit logs
- Manually change event status

## 📊 Features Guide

### Bulk Import

1. **Download Template**:
   - Go to Invitees page
   - Click "Bulk Import"
   - Click "Download Template"

2. **Fill Template**:
   - Open the Excel file
   - Read the instructions sheet
   - Fill the Template sheet with invitee data
   - Required columns: Name, Email, Phone
   - Optional: Position, Company, Category, Invitation Class, Notes

3. **Upload File**:
   - Select the event
   - Click "Upload & Import"
   - Review import results

### Reports

Four report types available (Directors and Admins only):

1. **Summary Per Event**: High-level overview grouped by event → inviter group → status
2. **Summary Per Inviter**: Track individual inviter performance
3. **Detail Per Event**: Complete invitee list with all details
4. **Detail Going**: Final attendee list (approved invitees only)

All reports support:
- Excel export
- CSV export
- PDF export
- Copy to clipboard
- Print

## 🔧 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError`  
**Solution**: Make sure virtual environment is activated and dependencies are installed

```powershell
cd backend
.\venv\Scripts\Activate
pip install -r requirements.txt
```

**Problem**: Database connection error  
**Solution**: Check PostgreSQL is running and credentials in `.env` are correct

```powershell
# Check PostgreSQL service
Get-Service -Name postgresql*

# If not running, start it
Start-Service postgresql-x64-15
```

### Frontend Issues

**Problem**: `npm: command not found`  
**Solution**: Node.js not installed or not in PATH

```powershell
# Check Node.js installation
node --version
npm --version
```

**Problem**: Port 5173 already in use  
**Solution**: Kill the process or use different port

```powershell
# Find process using port 5173
netstat -ano | findstr :5173

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## 🔒 Security Notes

1. **Change Default Password**: Always change the admin password after first login
2. **SECRET_KEY**: Generate a strong secret key for production
3. **Database Password**: Use a strong PostgreSQL password
4. **CORS**: Update CORS_ORIGINS in production to your actual domain
5. **HTTPS**: Use HTTPS in production

---

**Version**: 1.0.0  
**Last Updated**: January 2026
