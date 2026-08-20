# NIVARAN-AI — Grievance Redressal Workflow & Routing Specification

## 1. Master Grievance Lifecycle State Machine

```text
 ┌───────────────┐
 │   SUBMITTED   │ ◄── Applicant files grievance with initial details & documents
 └───────┬───────┘
         │ (FastAPI Background Task triggers AI inference)
         ▼
 ┌───────────────┐
 │ AI_PROCESSING │ ◄── NLP model computes predicted category & confidence
 └───────┬───────┘
         │ (Prediction recorded in ai_processing_records)
         ▼
 ┌────────────────┐
 │ PENDING_REVIEW │ ◄── Visible on Manager Dashboard for Category Confirmation
 └───────┬────────┘
         │ (Manager confirms/overrides category -> auto-dispatches to Assistant Dean)
         ▼
 ┌───────────────┐
 │   ASSIGNED    │ ◄── Dispatched to designated Subject Assistant Dean
 └───────┬───────┘
         │ (Authority opens case or begins work)
         ▼
 ┌───────────────┐ ◄────── (Restored after documents uploaded & reviewed)
 │  IN_PROGRESS  │ ────┐
 └───────┬───────┘     │ (Authority requests additional documents)
         │             ▼
         │      ┌──────────────────────┐
         │      │ AWAITING_INFORMATION │ ◄── Scholar receives in-app & email notification
         │      └──────────────┬───────┘
         │                     │ (Scholar uploads requested documents)
         │                     ▼
         │              (Restores to ASSIGNED / IN_PROGRESS)
         │
         │ (Authority submits resolution notes & optional proof attachment)
         ▼
 ┌───────────────┐
 │   RESOLVED    │ ◄── Scholar receives resolution email & in-app alert; Manager alerted
 └───────┬───────┘
         │ (Manager conducts administrative audit & closes grievance)
         ▼
 ┌───────────────┐
 │    CLOSED     │ ◄── Scholar receives closure email; Audit trail locked
 └───────┬───────┘
         │ (Manager or Applicant reopens case if unsatisfied)
         ▼
 ┌───────────────┐
 │   REOPENED    │ ───► Transitions back to IN_PROGRESS / ASSIGNED
 └───────────────┘
```

---

## 2. Multi-Tier Routing Engine

When the **Manager** reviews a grievance in `PENDING_REVIEW` and clicks **Confirm & Assign**, the system inspects the grievance's assigned `Category.routing_type`:

```text
                     Manager Review & Confirmation
                                   │
                                   ▼
                   Identify Subject Assistant Dean
             (Based on Scholar Subject -> SubjectCluster)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
   CASE 1:                   CASE 2:                   CASE 3:
   SUBJECT_ASSISTANT_DEAN    GRIEVANCE_CLUSTER         FIXED_AUTHORITY
         │                         │                         │
         ▼                         ▼                         ▼
  Assigned directly to      Assigned to Subject       Assigned to Subject
  Subject Assistant Dean    Assistant Dean            Assistant Dean
         │                         │                         │
         ▼                         ▼                         ▼
  Resolved directly by      Forwarded to mapped       Forwarded to mapped
  Assistant Dean            Associate Dean            Fixed Authority Officer
  (No forwarding allowed)   (Domain Cluster Review)   (e.g., Finance / Legal)
```

### Routing Scenarios in Detail:

#### Case 1: Subject Assistant Dean (`SUBJECT_ASSISTANT_DEAN`)
- **Use Case**: Discipline-specific grievances (coursework, supervisor disputes, lab allocation).
- **Flow**: Scholar $\to$ AI Intake $\to$ Manager Verification $\to$ Subject Assistant Dean $\to$ **Resolution**.
- **Rule**: Resolved directly at Assistant Dean level. No further internal forwarding buttons are enabled.

#### Case 2: Grievance Cluster (`GRIEVANCE_CLUSTER`)
- **Use Case**: Cross-disciplinary grievances (hostel welfare, exam evaluations, central library).
- **Flow**: Scholar $\to$ AI Intake $\to$ Manager Verification $\to$ Subject Assistant Dean $\to$ **Forward to Mapped Associate Dean** $\to$ **Resolution**.
- **Rule**: System automatically determines the correct Associate Dean from `Category.grievance_cluster_id`. The button and notification dynamically display the mapped officer's name (e.g., `Forward to Associate Dean (Dr. Arun Kumar Gupta)`).

#### Case 3: Fixed Authority (`FIXED_AUTHORITY`)
- **Use Case**: Centralized administrative domains (fellowship disbursements, degree verification, anti-ragging).
- **Flow**: Scholar $\to$ AI Intake $\to$ Manager Verification $\to$ Subject Assistant Dean $\to$ **Forward to Fixed Authority Officer** $\to$ **Resolution**.
- **Rule**: Directly routed to the designated officer configured in `Category.fixed_authority_id`.

#### Escalation to Dean (R&D)
- If an Associate Dean cannot resolve a dispute or policy clarification is required, they can **Escalate to Dean (Prof. Namita Tiwari)**.
- The Dean reviews the full history and records final executive resolution.

---

## 3. Additional Document Request Workflow

1. **Request Initiation**: An assigned Assistant Dean, Associate Dean, or Dean selects "Request Documents" from the grievance workspace.
2. **Payload**: Specifies document titles, required/optional flags, instructions, and an optional submission deadline.
3. **State Pause**:
   - `Grievance.status` transitions to `AWAITING_INFORMATION`.
   - `last_action_at` is updated.
   - `DocumentRequest` rows created in `PENDING` state.
4. **Applicant Notification**:
   - In-app notification created: `DOCUMENT_REQUESTED`.
   - Responsive HTML email dispatched to scholar with tracking chip, instructions, deadline, and direct action link.
5. **Scholar Upload**:
   - Scholar navigates to grievance detail and uploads requested files.
   - `DocumentRequest.status` becomes `UPLOADED`.
6. **Automatic State Restoration**:
   - When all required documents are uploaded, `Grievance.status` automatically restores to `ASSIGNED` or `IN_PROGRESS` with the **same assigned authority** preserved without rerouting.
   - Authority receives in-app alert `DOCUMENT_UPLOADED`.
7. **Authority Review**:
   - Authority opens document in the embedded **In-App Document Viewer**.
   - **Approve**: Marks request `APPROVED`.
   - **Reject / Request Re-upload**: Marks request `REJECTED`, grievance pauses in `AWAITING_INFORMATION` until scholar uploads a revised file.

---

## 4. 3-Day Inactivity Reminder Workflow

- **Objective**: Prevent grievances from stalling in authority queues.
- **Criteria**:
  - `status` in `[ASSIGNED, IN_PROGRESS, AWAITING_INFORMATION, REOPENED]`.
  - $\Delta t = (\text{now} - \text{last\_action\_at}) \ge 3 \text{ days}$.
  - Has not received a reminder within the current inactivity cycle (`last_reminder_at < last_action_at` or `last_reminder_at is NULL`).
- **Action**:
  - Creates In-App notification for the active assigned authority: `Grievance Action Overdue`.
  - Sends internal reminder email to authority.
  - Updates `Grievance.last_reminder_at = now()`.
- **Applicant Privacy Guard**: The applicant is **never** sent an email or alarmed about internal authority inactivity.
