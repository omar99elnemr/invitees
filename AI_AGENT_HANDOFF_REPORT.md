# AI Agent Handoff Report — Invitees Management System
**Date:** February 6, 2026  
**Session Scope:** Dark mode fixes, Historical Data report fix, "All Groups" event feature, Cross-group duplicate validation  
**Git Commits:** `7170a7cd` → `9470f4b7` (8 commits in this session)

---

## 1. SYSTEM ARCHITECTURE (CRITICAL — READ FIRST)

### Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Flask (Python) | 3.0+ / Python 3.14 |
| **ORM** | SQLAlchemy | via Flask-SQLAlchemy |
| **Database** | PostgreSQL | 18 |
| **Frontend** | React + TypeScript | 18.2.0 |
| **Build** | Vite | 5.4.21 |
| **CSS** | TailwindCSS | 3.4.x |
| **Web Server** | IIS 10.0 | Windows Server |
| **Backend Service** | NSSM ("InviteesAPI") | Port 5000 |
| **Domain** | https://invitees.aldauselect.com | SSL via IIS |

### File Paths
| Purpose | Path |
|---------|------|
| **Development workspace** | `C:\Users\Administrator\Downloads\invitees\` |
| **Production IIS root** | `C:\inetpub\wwwroot\invitees\` |
| **Production frontend** | `C:\inetpub\wwwroot\invitees\dist\` |
| **Production backend** | `C:\inetpub\wwwroot\invitees\backend\` |
| **Backend .env** | `C:\inetpub\wwwroot\invitees\backend\.env` |
| **IIS web.config** | `C:\inetpub\wwwroot\invitees\dist\web.config` |

### Deployment Procedure
```
1. Edit code in C:\Users\Administrator\Downloads\invitees\
2. Frontend: cd frontend && npx vite build
3. Copy dist/* to C:\inetpub\wwwroot\invitees\dist\ (PRESERVE web.config!)
4. Copy backend files to C:\inetpub\wwwroot\invitees\backend\
5. nssm restart InviteesAPI
6. iisreset
7. git add, commit, push
```

### ⚠️ CRITICAL DEPLOYMENT WARNINGS
1. **NEVER overwrite `C:\inetpub\wwwroot\invitees\dist\web.config`** — It contains IIS rewrite rules for API proxy, HTTPS redirect, SPA routing, and ACME challenge handling. Always back it up before deploying frontend assets, then restore it.
2. **The `web.config` in the dev `dist/` folder is NOT the same as production.** Production has been manually edited. Always preserve the production version.
3. **Backend service runs via NSSM** — Use `nssm restart InviteesAPI` not `python run.py`. The service wraps `python run.py` and runs on port 5000.

---

## 2. DATABASE STRUCTURE (CRITICAL)

### Current System Tables
| Table | Purpose |
|-------|---------|
| `events` | Event definitions (has `is_all_groups` boolean added in this session) |
| `invitees` | Contact/person records |
| `event_invitees` | Junction table linking events↔invitees (core operational table) |
| `inviters` | Named inviters within groups |
| `inviter_groups` | Groups that inviters belong to |
| `event_inviter_groups` | Junction: which groups can submit to which events |
| `users` | System users (admin, director, organizer, check_in_attendant) |
| `categories` | Category labels (e.g., White, Gold) |
| `audit_log` | System activity log |
| `alembic_version` | Migration tracking |

### ⚠️ LEGACY TABLE — DO NOT TOUCH
| Table | Purpose | Records |
|-------|---------|---------|
| `historical_invitees` | **READ-ONLY archival data from old system** | **5,866** |

**Columns:** `id`, `event_name`, `invitee_name`, `position`, `inviter_name`, `inviter_group_name`, `status`, `status_date`, `created_at`

**THIS TABLE HAS NO FOREIGN KEYS TO ANY OTHER TABLE.** It is a flat, denormalized snapshot of a previous system. The Historical Data report in the frontend reads from this table exclusively via raw SQL. **NEVER replace queries against this table with joins to current system tables.**

### Key Model Relationships (Gotchas)
- **EventInvitee → Inviter**: The `EventInvitee` model has `inviter_id` FK to `inviters` AND `inviter_user_id` FK to `users`. The `inviter` relationship uses `foreign_keys=[inviter_id]` explicitly.
- **EventInvitee → Category**: The relationship is named `category_rel` (NOT `category`). Always use `ei.category_rel.name` not `ei.category.name`.
- **EventInvitee → Users**: Has THREE FKs to `users` table: `inviter_user_id`, `approved_by_user_id`, `checked_in_by_user_id`. This causes SQLAlchemy `AmbiguousForeignKeysError` if you try implicit joins.
- **Invitee → InviterGroup**: `invitee.inviter_group_id` FK exists. When joining from EventInvitee through to InviterGroup, you must specify explicit `onclause`.

---

## 3. CHANGES MADE IN THIS SESSION

### 3.1 Feature: "All Groups" for Events (commit `7170a7cd`)
**Files modified:**
- `backend/app/models/event.py` — Added `is_all_groups = db.Column(db.Boolean, default=False)`
- `backend/app/routes/events.py` — Handle `is_all_groups` flag in create/update
- `backend/app/services/event_service.py` — Logic to treat `is_all_groups` events as accessible by all inviter groups
- `frontend/src/pages/Events.tsx` — UI toggle for "All Groups" option
- `backend/migrations/versions/e1f2a3b4c5d6_add_is_all_groups_to_events.py` — Migration file

### 3.2 Feature: Cross-Group Phone Duplicate Validation (commit `7170a7cd`)
**Files modified:**
- `backend/app/routes/invitees.py` — ~81 lines changed

**How it works:** When adding a new invitee to an event, the system checks if the same phone number already exists across ALL inviter groups for that event (not just the submitter's group). This prevents duplicate invitations.

**⚠️ Bug History (important for understanding the code):**
1. First implementation removed the status filter entirely — wrong, because it would block resubmission after legitimate rejection.
2. Second fix restored the status filter but still allowed resubmission after rejection to bypass the cross-group check.
3. **Final fix (correct):** The cross-group phone duplicate check runs BEFORE the existing/resubmission logic. The check excludes `rejected` status records so that a legitimately rejected invitee can be resubmitted, but only by the same person, not by another group.

### 3.3 Dark Mode Fixes (commits `e25e5dda`, `b9f5ce43`, `21b3d61f`, `9470f4b7`)
**Files modified (all in `frontend/src/pages/`):**
| File | What was fixed |
|------|----------------|
| `Approvals.tsx` | Bulk actions bar, tabs, text colors |
| `Invitees.tsx` | Status filter, tabs, stats cards, Add Contact modal (Name/Email/Phone inputs) |
| `Attendance.tsx` | Refresh button, tabs, empty states |
| `Dashboard.tsx` | Empty state text and icons |
| `Events.tsx` | Description text, copy icons |
| `Users.tsx` | Email, group, inviter text colors |
| `Reports.tsx` | Filter icon, group names |
| `Profile.tsx` | Building icon |

**Pattern used:** Added `dark:bg-gray-700 dark:text-white dark:border-gray-600` to input fields and `dark:text-gray-300` / `dark:text-gray-400` to text elements that were invisible in dark mode.

### 3.4 Historical Data Report Fix (commits `e25e5dda`, `57273325`, `49bd5041`)
**File:** `backend/app/routes/reports.py`

**This was the most problematic change — see Problem #1 below.**

---

## 4. PROBLEMS ENCOUNTERED & HOW THEY WERE MITIGATED

### Problem 1: Historical Data Report — CATASTROPHIC MISTAKE (FIXED)
**Severity:** Critical  
**What happened:** The Historical Data report was returning a 404 because the backend route didn't exist. I created the route, but **incorrectly implemented it by querying the current `event_invitees` table** joined with `invitees`, `events`, `inviters`, and `inviter_groups`. This was completely wrong.

**Why it was wrong:** The Historical Data report is supposed to read from a **standalone legacy table called `historical_invitees`** containing 5,866 archived records from a previous system. It has no relationships to current tables.

**How it was discovered:** User reported "this is not historical data" and that the original report had 5,800+ records.

**Cascading errors before the final fix:**
1. First attempt: Joined `EventInvitee` → `Invitee` → `Event` → `Inviter` → `InviterGroup` — caused `AmbiguousForeignKeysError` because EventInvitee has multiple FKs to both `inviters` and `users` tables.
2. Second attempt: Fixed joins with explicit `onclause` parameters — query worked but returned wrong data (current system data, not legacy).
3. Third attempt: Used `ei.category.name` — caused `AttributeError` because the relationship is named `category_rel`.
4. **Final fix:** Rewrote to use raw SQL against `historical_invitees` table directly with `sqlalchemy.text()`.

**Final implementation (correct, in production now):**
```python
base_query = "SELECT id, event_name, invitee_name, position, inviter_name, inviter_group_name, status, status_date, created_at FROM historical_invitees WHERE 1=1"
```
Uses parameterized raw SQL with ILIKE filters. No ORM model needed. Returns all 5,866 records.

The `/historical/filters` endpoint also queries `historical_invitees` with `SELECT DISTINCT` for filter dropdowns.

**Mitigation:** Added extensive comments in `reports.py` warning future agents not to modify this implementation.

### Problem 2: SQLAlchemy AmbiguousForeignKeysError
**Context:** When trying to join `EventInvitee` with `Inviter` table.  
**Root cause:** `EventInvitee` has `inviter_id` FK to `inviters` table, but the chain of joins also implicitly connects through `invitee.inviter_group_id` → `inviter_groups` → potentially back to `inviters`.  
**Resolution:** Always use explicit `onclause` in joins:
```python
.outerjoin(Inviter, EventInvitee.inviter_id == Inviter.id)
```

### Problem 3: `category_rel` vs `category`
**Context:** EventInvitee model has `category_id` FK column but the relationship is named `category_rel`.  
**Root cause:** The legacy `category` string column was commented out, and the new relationship to the `Category` model was named `category_rel` to avoid confusion.  
**Resolution:** Always use `ei.category_rel` not `ei.category` when accessing the Category object.

### Problem 4: web.config Overwrite Risk
**Context:** Every frontend deployment copies `dist/*` to `C:\inetpub\wwwroot\invitees\dist\`.  
**Risk:** The `web.config` in the dev `dist/` folder could overwrite the production `web.config` which has custom IIS rules.  
**Resolution:** Always back up and restore production `web.config` during deployment. The deployment procedure saves it before copy and restores after.

### Problem 5: Vite Build Hanging
**Context:** `npx vite build` occasionally appears to hang with no output.  
**Resolution:** Run it with `isBackground: true` or wait patiently — it takes ~15-30 seconds on this server. Verify completion by checking for `dist/index.html` and `dist/assets/*.js` files.

---

## 5. CURRENT FILE STATE SUMMARY

### Backend Routes (`backend/app/routes/reports.py`) — 257 lines
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/reports/summary-per-event` | GET | Report 1: Summary by event |
| `/api/reports/summary-per-inviter` | GET | Report 2: Summary by inviter |
| `/api/reports/detail-per-event` | GET | Report 3: Detail by event |
| `/api/reports/detail-going` | GET | Report 4: Approved attendees |
| `/api/reports/activity-log` | GET | Report 5: Audit log |
| `/api/reports/activity-log/actions` | GET | Distinct action types |
| `/api/reports/activity-log/users` | GET | Users who performed actions |
| `/api/reports/historical` | GET | **Report 6: Legacy data (5,866 records from `historical_invitees` table)** |
| `/api/reports/historical/filters` | GET | Filter options from legacy table |

### Frontend Interface Alignment
The `HistoricalInvitee` TypeScript interface (`Reports.tsx` line 31) expects:
```typescript
interface HistoricalInvitee {
  id: number;
  event_name: string;
  invitee_name: string;
  position: string;
  inviter_name: string;
  inviter_group_name: string;
  status: string;
  status_date: string;
}
```
The backend returns exactly these fields. Note: `created_at` is also returned by the backend but is not in the frontend interface (harmless — it's ignored).

---

## 6. THINGS TO WATCH OUT FOR (FOR NEXT AGENT)

### DO NOT:
1. ❌ Replace `historical_invitees` raw SQL queries with ORM joins to current tables
2. ❌ Create a SQLAlchemy model for `historical_invitees` (it's intentionally model-less)
3. ❌ Overwrite production `web.config` during deployment
4. ❌ Use `ei.category` — use `ei.category_rel` instead
5. ❌ Do implicit joins between `EventInvitee` and `Inviter`/`User` — always specify `onclause`
6. ❌ Assume `__pycache__` files are up to date — always restart the NSSM service after backend changes
7. ❌ Run `python run.py` in production — use `nssm restart InviteesAPI`

### DO:
1. ✅ Always `nssm restart InviteesAPI` after ANY backend file change
2. ✅ Always `iisreset` after frontend deployment
3. ✅ Always preserve `web.config` when deploying frontend
4. ✅ Test queries with `python -c "..."` in the backend directory before deploying
5. ✅ Use explicit join conditions for any SQLAlchemy query involving `EventInvitee`
6. ✅ Add `dark:` TailwindCSS variants when modifying any UI component
7. ✅ Run `git add` only for source files, not `__pycache__`

### User Roles in the System
| Role | Permissions |
|------|-------------|
| `admin` | Full access, can approve/reject, manage users, view all reports |
| `director` | Can approve/reject invitees, view reports |
| `organizer` | Can submit invitees, view own submissions |
| `check_in_attendant` | Can check in guests at events |

### Git Remote
- Repository: `https://github.com/omar99elnemr/invitees.git`
- Branch: `main`
- Latest commit: `9470f4b7`

---

## 7. CURRENT PRODUCTION STATE (Feb 6, 2026, 3:06 PM)

| Component | Hash/File | Status |
|-----------|-----------|--------|
| Backend `reports.py` | Uses `historical_invitees` table with raw SQL | ✅ Deployed |
| Frontend bundle | `index-CsXhDLVB.js` (1,028,449 bytes) | ✅ Deployed |
| web.config | Production version with SSL/proxy/SPA rules | ✅ Preserved |
| InviteesAPI service | NSSM, port 5000 | ✅ Running |
| IIS | Restarted at 3:06 PM | ✅ Running |
| Dark mode | Fixed across 8 pages | ✅ Deployed |
| Historical Data | 5,866 legacy records from `historical_invitees` | ✅ Working |
