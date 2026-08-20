# NIVARAN-AI — Notification & Email Delivery Architecture

## 1. Dual-Channel Notification Architecture

NIVARAN-AI features a centralized notification pipeline that coordinates **In-App Notification Bell alerts** with **High-Priority Email Deliveries**.

```text
                    GRIEVANCE EVENT
                           │
                           ▼
                 Notification Service
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
     In-App Notification          Email Notification
             │                           │
             ▼                           ▼
     Notification Bell             Important Events Only
   (14 Lifecycle Events)         • DOCUMENT_REQUESTED
                                 • GRIEVANCE_RESOLVED
                                 • GRIEVANCE_CLOSED
```

---

## 2. Channel Matrix by Event Type

| Event Type | In-App Recipient | Email Recipient | Email Dispatched |
|---|---|---|---|
| `GRIEVANCE_SUBMITTED` | Applicant | — | ❌ No |
| `GRIEVANCE_ASSIGNED` | Assigned Authority | — | ❌ No |
| `DOCUMENT_REQUESTED` | Applicant | Applicant | ✅ **YES** |
| `DOCUMENT_UPLOADED` | Assigned Authority | — | ❌ No |
| `DOCUMENT_APPROVED` | Applicant | — | ❌ No |
| `DOCUMENT_REJECTED` | Applicant | — | ❌ No |
| `GRIEVANCE_FORWARDED` | Target Authority, Applicant | — | ❌ No |
| `GRIEVANCE_ESCALATED` | Dean, Associate Dean | — | ❌ No |
| `GRIEVANCE_RESOLVED` | Applicant, Managers | Applicant | ✅ **YES** |
| `GRIEVANCE_CLOSED` | Applicant | Applicant | ✅ **YES** |
| `GRIEVANCE_REOPENED` | Assigned Authority | — | ❌ No |
| `REMINDER` (3-Day Inactivity) | Assigned Authority | Assigned Authority | ❌ (No applicant email) |
| `SYSTEM` | Target User | — | ❌ No |

---

## 3. Email Template Design & Delivery

### 3.1. Template Standards
All emails are rendered from modular responsive HTML templates in `backend/app/templates/emails/`:
- **Theme Palette**: CSJMU Crimson (`#5b1021`), Gold accents (`#d4af37`), Slate background (`#f8fafc`).
- **Standard Header**: Prominent university logo and NIVARAN-AI branding.
- **Details Card**: Grievance tracking chip (`GRV-...`), grievance title, instructions/resolution notes, and deadline.
- **Action Button**: Direct call-to-action button linking directly to the applicant's workspace (`{FRONTEND_URL}/dashboard/grievances/{grievance_id}`).

### 3.2. Templates
1. **`document_request.html`**: Alerts applicant that supporting documents are required to resume processing.
2. **`grievance_resolved.html`**: Confirms that university authorities have resolved the grievance with detailed resolution notes.
3. **`grievance_closed.html`**: Informs applicant of formal administrative closure with audit remarks.

---

## 4. SMTP Failure Resilience & Security

1. **Non-Blocking Error Handling**:
   - The email dispatcher wraps network operations in safe `try/except` blocks.
   - If the SMTP server is down or unreachable, the grievance transition still completes successfully (`200 OK`), the in-app notification persists, and the incident is logged safely:
     ```text
     [EMAIL_FAILED] Failed to send email to scholar@univ.ac.in | Subject: '...' | Error: ConnectionRefusedError
     ```
2. **Credential Safety**:
   - Error messages strip out credentials and passwords before writing to server logs.
3. **Duplicate Prevention**:
   - Status transition guards (`previous_status != new_status`) prevent repeat email dispatch if an authority clicks resolve or close multiple times.
