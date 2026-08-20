# NIVARAN-AI — Roles, RBAC & Security Permission Matrix

## 1. User Roles

| Role Key | Role Title | Primary Responsibilities |
|---|---|---|
| `APPLICANT` | Research Scholar / Student | Submits grievances, tracks real-time progress, uploads evidence, responds to document requests. |
| `MANAGER` | R&D Support Manager | Audits AI predictions, confirms/overrides categories, dispatches routing, performs closure review. |
| `ASSISTANT_DEAN` | Assistant Dean (Subject Specialist) | Subject-level review, requests additional documents, direct resolution, cluster forwarding. |
| `ASSOCIATE_DEAN` | Associate Dean (Domain Cluster) | Cluster-level oversight, resolves cross-discipline cases, escalates policy disputes to Dean. |
| `DEAN` | Dean of Research & Development | Executive oversight, strategic workload analytics, final resolution of escalated grievances. |

---

## 2. Granular Permissions Matrix

| Permission Key | APPLICANT | MANAGER | ASSISTANT_DEAN | ASSOCIATE_DEAN | DEAN |
|---|:---:|:---:|:---:|:---:|:---:|
| `SUBMIT_GRIEVANCE` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `VIEW_OWN_GRIEVANCES` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `VIEW_ALL_GRIEVANCES` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `VIEW_ASSIGNED_GRIEVANCES` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `REVIEW_AI_CATEGORY` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `ASSIGN_GRIEVANCE` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `FORWARD_GRIEVANCE` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `ESCALATE_TO_DEAN` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `REQUEST_DOCUMENTS` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `UPLOAD_DOCUMENT` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `REVIEW_REQUESTED_DOCS` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `RESOLVE_GRIEVANCE` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `CLOSE_GRIEVANCE` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `REOPEN_GRIEVANCE` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `VIEW_DEAN_ANALYTICS` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Data Isolation Rules

1. **Scholar Confidentiality**:
   - `APPLICANT` accounts cannot view grievances, documents, or notifications belonging to other scholars.
   - Database queries automatically enforce `WHERE applicant_id = current_user.id` when caller is an applicant.
2. **Authority Scope**:
   - Assistant Deans and Associate Deans only have operational write access (resolution, document requests) to grievances where they are the **active assigned officer** (`Assignment.is_active = True`).
   - Cross-officer actions are blocked with `403 FORBIDDEN: You are not the active assigned authority for this grievance.`
3. **Audit Trail Immutability**:
   - Rows in `audit_logs` and `grievance_status_history` are append-only. No user role (including Dean) is permitted to update or delete audit records through the API.
