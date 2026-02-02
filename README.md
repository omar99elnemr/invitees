# Invitees - Event Guest Management System

A full-stack enterprise application for managing event invitations, guest lists, check-ins, and approval workflows. Built with Flask (Python) backend and React (TypeScript) frontend.

---

## Features

### Authentication & Authorization
- **Role-Based Access Control**: Admin, Director, Organizer roles with distinct permissions
- **Secure Sessions**: HTTP-only cookies, bcrypt password hashing
- **Audit Logging**: Track all user actions with IP addresses and timestamps

### Event Management
- **Event Lifecycle**: Upcoming → Ongoing → Ended (automatic status transitions)
- **Group Assignment**: Assign Inviter Groups to specific events
- **Check-in System**: PIN-based access for attendants (no login required)
- **Live Dashboard**: Real-time attendance statistics (public URL)

### Contact Management
- **Centralized Contacts**: Group-specific contact pools
- **Rich Profiles**: Name, phone (primary/secondary), email, company, position, category, notes
- **Duplicate Prevention**: Automatic phone number validation
- **Bulk Import**: Excel/CSV import with validation and template download

### Approval Workflow
1. Organizer submits contacts to an event → Status: `Pending`
2. Director reviews and approves/rejects → Status: `Approved` or `Rejected`
3. Rejected contacts can be edited and resubmitted
4. Bulk approve/reject actions available

### Attendance Tracking
- **Check-in Console**: PIN-protected, event-specific check-in interface
- **QR Code Support**: Generate QR codes linking to check-in console
- **Guest Tracking**: Track primary guest and +N companions
- **Real-time Stats**: Live dashboard shows attendance counts

### Reports & Exports
- **Summary Report**: Event statistics overview
- **Detail Report**: Full guest list with check-in status
- **Activity Log**: User action history with filters
- **Export Formats**: PDF and Excel

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Flask 3.x, Python 3.10+, SQLAlchemy ORM |
| **Database** | PostgreSQL 14+ |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | TailwindCSS, Lucide Icons |
| **Auth** | Flask-Login, Bcrypt |

---

## Project Structure

```
invitees/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models (9 models)
│   │   ├── routes/          # API endpoints (15 route files)
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── migrations/          # Alembic migrations
│   ├── requirements.txt
│   ├── run.py               # Dev entry point
│   └── seed.py              # Database seeding
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # 12 page components
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth & Theme contexts
│   │   └── services/        # API service layer
│   ├── package.json
│   └── vite.config.ts
│
├── DEPLOYMENT_GUIDE_GODADDY.md        # Linux/Ubuntu deployment
└── DEPLOYMENT_GUIDE_WINDOWS_SERVER.md # Windows Server deployment
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### 1. Database
```sql
CREATE DATABASE invitees_db;
```

### 2. Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate      # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
cp .env.example .env         # Edit with your DATABASE_URL
flask db upgrade
python seed.py               # Creates admin user
python run.py                # Runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                  # Runs on http://localhost:5173
```

### Default Login
- **Username**: `admin`
- **Password**: `Admin@123`

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access. Manage users, groups, events, categories. View all data. |
| **Director** | Manage their group. Approve/reject submissions. View group reports. |
| **Organizer** | Add contacts. Submit to events. View own submissions. |

---

## API Routes

| Module | Endpoints |
|--------|-----------|
| `auth` | Login, logout, session check |
| `users` | User CRUD, password management |
| `events` | Event CRUD, group assignment, PIN management |
| `invitees` | Contact CRUD, bulk operations |
| `approvals` | Submit, approve, reject, cancel |
| `attendance` | Check-in, attendance records |
| `checkin` | PIN verification, public check-in console |
| `live_dashboard` | Real-time event stats (public) |
| `reports` | Summary, detail, activity log exports |
| `categories` | Category management |
| `inviter_groups` | Group CRUD |
| `inviters` | Inviter management within groups |

---

## Pages

| Page | Description |
|------|-------------|
| `Login` | Authentication |
| `Dashboard` | Role-specific statistics and quick actions |
| `Events` | Event management and guest submissions |
| `Invitees` | Contact management (Contacts tab) and event submissions (Events tab) |
| `Approvals` | Pending and approved submissions (Director/Admin) |
| `Attendance` | Check-in records and manual attendance |
| `Reports` | Generate and export reports |
| `Users` | User, group, and inviter management (Admin) |
| `Profile` | User profile and password change |
| `CheckInConsole` | PIN-protected event check-in (public) |
| `LiveDashboard` | Real-time attendance stats (public) |
| `Portal` | Event selection portal |

---

## Check-in System

The check-in system allows non-authenticated attendants to check in guests:

1. **Admin generates PIN** for an event (Event Details → Generate Check-in PIN)
2. **Share URL + PIN** with attendants: `/checkin/{event_code}`
3. **Attendant enters PIN** → accesses check-in console
4. **Search and check in guests** by name or phone
5. **Live Dashboard** shows real-time stats: `/live/{event_code}`

---

## Deployment

See deployment guides for production setup:

- **Linux/Ubuntu (VPS)**: `DEPLOYMENT_GUIDE_GODADDY.md`
- **Windows Server 2019+**: `DEPLOYMENT_GUIDE_WINDOWS_SERVER.md`

---

## Environment Variables

```env
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost:5432/invitees_db
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
CORS_ORIGINS=https://yourdomain.com
```

---

## License

Proprietary - All rights reserved.
