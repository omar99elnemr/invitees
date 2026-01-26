# Event Invitees Management System

A comprehensive enterprise-grade application for managing event guest lists, simplifying the invitation process, and ensuring secure approval workflows. Designed for organizations with hierarchical teams handling complex event logistics.

---

## 🌟 Key Features

### 🔐 Security & Access Control
- **Role-Based Access Control (RBAC)**: Distinct permissions for Admins, Directors, and Organizers.
- **Secure Authentication**: Encrypted sessions and password hashing using bcrypt.
- **Audit Logging**: Complete track record of every action (who, what, when, from where).

### 📅 Event Management
- **Event Lifecycle**: Manage events from Upcoming → Ongoing → Ended.
- **Multi-Group Assignment**: Assign specific Inviter Groups to handle different events.
- **Smart Status Updates**: Automatic status transitions based on system time.

### 👥 Power Contact Management (CRM)
- **Centralized Database**: Global contact pool shared across the Inviter Group.
- **Rich Contact Profiles**: Store names, phones (primary/secondary), emails, positions, companies, categories, and notes.
- **Duplicate Prevention**: automatic checking to prevent duplicate entries.
- **Bulk Operations**: Import hundreds of contacts via Excel/CSV with validation.

### ✅ Approval Workflow Engine
1. **Submission**: Organizers select contacts from their pool and submit them to an event.
2. **Review**: Directors review pending submissions with full context.
3. **Decision**: Approve or Reject (with required rejection notes).
4. **Resubmission**: Rejected contacts can be corrected and resubmitted for review.

### 📊 Reporting & Analytics
- **Dynamic Dashboards**: Real-time stats for Organizers, Directors, and Admins.
- **Exportable Reports**: Generate PDF, Excel, and CSV reports.
  - *Summary Per Event*: High-level stats.
  - *Detail Going*: Final guest list for door management.
  - *Inviter Performance*: Track who is inviting whom.

---

## 🏗️ Technical Architecture

### Backend (Python/Flask)
- **Core**: Flask 3.x, Python 3.10+
- **Database**: PostgreSQL 15+ with SQLAlchemy ORM
- **Migrations**: Alembic (Flask-Migrate)
- **Security**: Flask-Login, Bcrypt, CORS protection

### Frontend (React/TypeScript)
- **Core**: React 18, TypeScript, Vite
- **UI System**: Tailwind CSS, Lucide Icons
- **Data Fetching**: Axios with centralized error handling
- **State**: Context API + React Hooks

---

## 🚀 Installation & Setup Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 15+**
- **Git**

### 1. Database Setup
```sql
-- Create the database in PostgreSQL
CREATE DATABASE invitees_db;
```

### 2. Backend Installation
```bash
cd backend

# Create & Activate Virtual Environment
python -m venv venv
# Windows:
.\venv\Scripts\Activate
# Mac/Linux:
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Configure Environment
cp .env.example .env
# EDIT .env file with your database credentials:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/invitees_db

# Initialize Database
flask db upgrade

# Seed Initial Data (Create Admin User)
python seed.py

# Run Server
python run.py
```
*Backend runs on: `http://localhost:5000`*

### 3. Frontend Installation
```bash
cd frontend

# Install Dependencies
npm install

# Run Development Server
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## 📘 User Manual & Workflows

### 👥 User Roles explained

| Role | Responsibility |
|------|----------------|
| **Admin** | System owner. Manages Users, Groups, Categories, and global settings. Can edit/delete anything. |
| **Director** | Head of a Team (Inviter Group). Reviews and approves/rejects guests submitted by their team. |
| **Organizer** | Team member. Adds contacts and submits them to assigned events. Cannot approve guests. |

---

### 🔄 The "Invite-to-Approval" Workflow

This is the core workflow of the application:

1. **Add Contact (Organizer)**:
   - Go to **Invitees** page → Click **Add Contact**.
   - Fills details (Name, Phone, Email, etc.).
   - *Result*: Contact is added to the Team's contact pool. NOT yet invited to any event.

2. **Submit to Event (Organizer)**:
   - Go to **Jobs/Events** tab.
   - Select an **Event**.
   - Search/Select contacts from the pool.
   - Click **Submit for Approval**.
   - *Result*: Status becomes `Pending Approval`.

3. **Review (Director)**:
   - Go to **Approvals** page.
   - Sees list of Pending requests.
   - **Approve**: Status becomes `Approved`. The guest is now on the final list.
   - **Reject**: Must enter a note explaining why. Status becomes `Rejected`.

4. **Resubmit (Organizer)**:
   - If rejected, Organizer sees the note.
   - Can edit the contact (e.g., fix name) and click **Resubmit**.
   - Cycle returns to Step 3.

---

### 🛠️ Administrative Tasks

#### Creating a New Team (Inviter Group)
1. Login as Admin.
2. Go to **Inviter Groups**.
3. Create New Group (e.g., "Sales Team", "VIP Relations").

#### Adding Users
1. Go to **Users** → **Add User**.
2. **Director**: Assign them to a Group (e.g., "Sales Director" -> "Sales Team").
3. **Organizer**: Assign them to the SAME Group (e.g., "Sales Rep" -> "Sales Team").

#### Creating an Event
1. Go to **Events** → **Create Event**.
2. Assign **Inviter Groups** who are allowed to invite people to this event.
   - *Example*: Assign "Sales Team" to "Launch Party". Now only Sales Team members can submit guests.

---

## � Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| **Login Failed** | Database not seeded or wrong password | Run `python seed.py` to reset admin. Default is `admin` / `Admin@123`. |
| **"Network Error"** | Backend not running | Check if `python run.py` terminal is active and no errors. |
| **Changes not saving** | Database migration missing | Run `flask db upgrade` in backend folder. |
| **Upload Failed** | Excel format mismatch | Use the "Download Template" button in the Import modal and don't change header names. |

---

## 🔒 Security Best Practices for Deployment

1. **Change Secret Key**: Update `SECRET_KEY` in `.env` to a long random string.
2. **Production Mode**: Set `FLASK_ENV=production`.
3. **HTTPS**: Always serve frontend/backend over HTTPS.
4. **Database**: Use a managed PostgreSQL instance (e.g., AWS RDS) with restrictive firewalls.
