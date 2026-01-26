# Event Invitees Management System

A comprehensive web application for managing event invitations with role-based access control, approval workflows, and detailed reporting.

## 📖 Application Walkthrough

### 1. User Roles & Authentication
The system supports three distinct user roles with hierarchical permissions:

*   **Admin**: Full system control. Can manage users, inviter groups, events, and view all system logs.
*   **Director**: Manages their assigned inviter group. Can approve/reject contact submissions and view reports.
*   **Organizer**: Part of an inviter group. Can add contacts and submit them to events for approval.

**Login**: Access the system at `/login`.
**Profile**: Change password via the profile menu in the top right.

### 2. Contact Management (New Workflow)
We have separated contact management from event submission to allow for better data organization.

*   **Adding Contacts**:
    1.  Go to the **Contacts** tab (default view).
    2.  Click **Add Contact**.
    3.  Fill in the detailed form (Name, Email, Phone, Title, Address, etc.).
    4.  The contact is saved to your group's "Contact List" but is **not yet assigned to any event**.

*   **Editing Contacts**:
    *   Click the **Edit** icon on any contact.
    *   All fields including secondary phone, address, and notes can be updated.
    *   Changes are reflected immediately in the database.

*   **Bulk Import**:
    *   Use the **Import** button to upload contacts via Excel/CSV.
    *   Download the template to ensure correct formatting.

### 3. Event Submission Workflow
Once contacts are in your list, you can invite them to specific events.

1.  **Select Event**:
    *   Go to the **Events** tab.
    *   Select an active event from the list.

2.  **Submit Contacts**:
    *   You will see a list of "Available Contacts" (contacts in your group not yet invited to this event).
    *   Select contacts using the checkboxes.
    *   Click **Submit for Approval**.
    *   The contacts move to the **Pending Approval** status for this event.

### 4. Approval Process (Directors/Admins)
Directors need to review submissions before they become official attendees.

1.  **Review Pending**:
    *   Select the event.
    *   View the list of contacts in "Pending" status.
    *   **Approve**: Click the checkmark. The contact becomes "Approved" and appears on the final guest list.
    *   **Reject**: Click the 'X'. You can add a note explaining the rejection.

2.  **Resubmission**:
    *   Rejected contacts can be corrected and **Resubmitted** by the organizer.
    *   They return to the "Pending Approval" state for re-review.

### 5. Reporting
*   **Summary Reports**: High-level stats per event or inviter.
*   **Detailed Reports**: Export full lists of approved guests (the "Door List").
*   **Exports**: All reports can be downloaded as Excel, CSV, or PDF.

---

## 🛠️ Technology Stack

*   **Backend**: Python Flask, SQLAlchemy, PostgreSQL
*   **Frontend**: React (Vite), TypeScript, Tailwind CSS
*   **Database**: PostgreSQL 15+

---

## 🚀 Installation & Setup

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   PostgreSQL 15+

### 1. Database Setup
1.  Create a PostgreSQL database named `invitees_db`.
2.  Update `backend/.env` with your database credentials:
    ```env
    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/invitees_db
    ```

### 2. Backend Installation
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\Activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Run Database Migrations (Crucial!)
flask db upgrade

# Seed Initial Data (Admin user)
python seed.py

# Start Server
python run.py
```
*Backend runs on `http://localhost:5000`*

### 3. Frontend Installation
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## ⚠️ Important Troubleshooting

**Database Changes**:
If you encounter errors about missing columns (e.g., `secondary_phone`, `plus_one`), you likely need to apply the latest database migrations:
```bash
cd backend
flask db upgrade
```

**Workflow Behavior**:
*   **New Contacts**: Do NOT appear in the "Approved" list immediately. They must be **Submitted** to an event and then **Approved**.
*   **Missing Fields**: If adding a contact doesn't save specifically fields like "Address" or "Notes", ensure the backend has been restarted after the latest code updates.

---

## 🔒 Security
*   **Admin Password**: Default is `Admin@123`. Change immediately after first login.
*   **Privacy**: Contact details (phone/email) are hidden by default in API responses unless specifically requested by authorized views.
