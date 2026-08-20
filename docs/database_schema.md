# NIVARAN-AI — Complete Database Schema & Data Dictionary

## 1. Entity-Relationship Overview

```text
 ┌──────────────┐         1:N         ┌───────────────────┐
 │    users     ├────────────────────►│    grievances     │
 └──────┬───────┘ (applicant_id)      └─────────┬─────────┘
        │                                       │
        │ 1:N (user_id)                         │ 1:N (grievance_id)
        ├─────────────────────┐                 ├─────────────────────────────┐
        │                     │                 │                             │
        ▼                     ▼                 ▼                             ▼
 ┌──────────────┐      ┌──────────────┐  ┌──────────────┐              ┌──────────────┐
 │notifications │      │  audit_logs  │  │  documents   │              │doc_requests  │
 └──────────────┘      └──────────────┘  └──────────────┘              └──────────────┘
                                                │                             │
                                                │ 1:N                         │ 1:N
                                                ▼                             ▼
                                         ┌──────────────┐              ┌──────────────┐
                                         │ assignments  │              │ai_proc_recs  │
                                         └──────────────┘              └──────────────┘
```

---

## 2. Table Specifications

### 2.1. `users`
Stores all system accounts: Applicants (scholars), Managers, Assistant Deans, Associate Deans, and the Dean.
- `id` (`UUID`, PK, default `uuid_generate_v4()`)
- `email` (`VARCHAR(255)`, UNIQUE, NOT NULL, indexed)
- `password_hash` (`VARCHAR(255)`, NOT NULL)
- `full_name` (`VARCHAR(255)`, NOT NULL)
- `role` (`ENUM(user_role)`: `APPLICANT`, `MANAGER`, `ASSISTANT_DEAN`, `ASSOCIATE_DEAN`, `DEAN`, NOT NULL)
- `department` (`VARCHAR(100)`, default `'R&D'`)
- `phd_registration_number` (`VARCHAR(100)`, NULL for authorities)
- `subject_id` (`UUID`, FK `subjects.id`, NULL for authorities)
- `is_active` (`BOOLEAN`, default `TRUE`)
- `created_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`)
- `updated_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`)

### 2.2. `grievances`
Primary record tracking filed grievances.
- `id` (`UUID`, PK)
- `grievance_id` (`VARCHAR(30)`, UNIQUE, NOT NULL, indexed) — e.g. `GRV-2026-A1B2C3`
- `applicant_id` (`UUID`, FK `users.id`, NOT NULL, indexed)
- `title` (`VARCHAR(255)`, NOT NULL)
- `description` (`TEXT`, NOT NULL)
- `category_id` (`UUID`, FK `categories.id`, nullable) — Initial/predicted category
- `final_category_id` (`UUID`, FK `categories.id`, nullable) — Manager-confirmed category
- `category_reviewed` (`BOOLEAN`, default `FALSE`)
- `category_overridden` (`BOOLEAN`, default `FALSE`)
- `status` (`ENUM(grievance_status)`, NOT NULL, default `SUBMITTED`, indexed)
- `priority` (`ENUM(grievance_priority)`, default `MEDIUM`)
- `subject_id` (`UUID`, FK `subjects.id`, nullable)
- `resolution_notes` (`TEXT`, nullable)
- `resolved_by_id` (`UUID`, FK `users.id`, nullable)
- `resolved_at` (`TIMESTAMP WITH TIME ZONE`, nullable)
- `closure_remarks` (`TEXT`, nullable)
- `closed_by_id` (`UUID`, FK `users.id`, nullable)
- `closed_at` (`TIMESTAMP WITH TIME ZONE`, nullable)
- `last_action_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`, indexed)
- `last_reminder_at` (`TIMESTAMP WITH TIME ZONE`, nullable)
- `submitted_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`)
- `created_at` / `updated_at` (`TIMESTAMP WITH TIME ZONE`)

### 2.3. `categories` & Routing
Defines grievance categories and automated routing rules.
- `id` (`UUID`, PK)
- `name` (`VARCHAR(100)`, UNIQUE, NOT NULL)
- `description` (`TEXT`, nullable)
- `routing_type` (`ENUM(category_routing_type)`: `SUBJECT_ASSISTANT_DEAN`, `GRIEVANCE_CLUSTER`, `FIXED_AUTHORITY`, NOT NULL)
- `grievance_cluster_id` (`UUID`, FK `grievance_clusters.id`, nullable)
- `fixed_authority_id` (`UUID`, FK `users.id`, nullable)
- `is_active` (`BOOLEAN`, default `TRUE`)

### 2.4. `subjects` & `subject_clusters`
Maps university academic disciplines to Assistant Deans.
- **`subject_clusters`**:
  - `id` (`UUID`, PK)
  - `cluster_number` (`INTEGER`, UNIQUE, NOT NULL)
  - `name` (`VARCHAR(100)`, NOT NULL)
  - `assistant_dean_id` (`UUID`, FK `users.id`, NOT NULL)
- **`subjects`**:
  - `id` (`UUID`, PK)
  - `name` (`VARCHAR(100)`, UNIQUE, NOT NULL)
  - `cluster_id` (`UUID`, FK `subject_clusters.id`, NOT NULL)

### 2.5. `grievance_clusters`
Maps grievance domains to Associate Deans.
- `id` (`UUID`, PK)
- `cluster_number` (`INTEGER`, UNIQUE, NOT NULL)
- `name` (`VARCHAR(100)`, NOT NULL)
- `associate_dean_id` (`UUID`, FK `users.id`, NOT NULL)

### 2.6. `assignments`
Tracks active and historical officer assignments.
- `id` (`UUID`, PK)
- `grievance_id` (`UUID`, FK `grievances.id`, NOT NULL, indexed)
- `assigned_to` (`UUID`, FK `users.id`, NOT NULL, indexed)
- `assigned_by` (`UUID`, FK `users.id`, NOT NULL)
- `assigned_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`)
- `is_active` (`BOOLEAN`, default `TRUE`, indexed)

### 2.7. `documents` & `document_requests`
- **`documents`**:
  - `id` (`UUID`, PK)
  - `grievance_id` (`UUID`, FK `grievances.id`, NOT NULL, indexed)
  - `uploaded_by` (`UUID`, FK `users.id`, NOT NULL)
  - `file_name` (`VARCHAR(255)`, NOT NULL)
  - `file_path` (`VARCHAR(500)`, NOT NULL)
  - `mime_type` (`VARCHAR(100)`, NOT NULL)
  - `file_size` (`INTEGER`, NOT NULL)
  - `document_type` (`VARCHAR(50)`, default `'ATTACHMENT'`) — `ATTACHMENT`, `REQUESTED_DOCUMENT`, `RESOLUTION_PROOF`
  - `created_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`)
- **`document_requests`**:
  - `id` (`UUID`, PK)
  - `grievance_id` (`UUID`, FK `grievances.id`, NOT NULL, indexed)
  - `request_group_id` (`UUID`, NOT NULL, indexed)
  - `requested_by_id` (`UUID`, FK `users.id`, NOT NULL)
  - `document_name` (`VARCHAR(255)`, NOT NULL)
  - `description` (`TEXT`, nullable)
  - `is_required` (`BOOLEAN`, default `TRUE`)
  - `status` (`ENUM(document_request_status)`: `PENDING`, `UPLOADED`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`)
  - `deadline` (`TIMESTAMP WITH TIME ZONE`, nullable)
  - `previous_grievance_status` (`VARCHAR(50)`, nullable)
  - `fulfilled_document_id` (`UUID`, FK `documents.id`, nullable)
  - `requested_at` / `responded_at` / `reviewed_at` (`TIMESTAMP WITH TIME ZONE`)

### 2.8. `notifications`
- `id` (`UUID`, PK)
- `user_id` (`UUID`, FK `users.id`, NOT NULL, indexed)
- `grievance_id` (`UUID`, FK `grievances.id`, nullable, indexed)
- `notification_type` (`ENUM(notification_type)`, NOT NULL)
- `title` (`VARCHAR(255)`, NOT NULL)
- `message` (`TEXT`, NOT NULL)
- `is_read` (`BOOLEAN`, default `FALSE`, indexed)
- `created_at` (`TIMESTAMP WITH TIME ZONE`, default `now()`, indexed)

### 2.9. `audit_logs` & `grievance_status_history`
- **`audit_logs`**: Immutable security log of every mutation (`action`, `entity_type`, `entity_id`, `description`, `created_at`).
- **`grievance_status_history`**: Chronological state timeline (`previous_status`, `new_status`, `changed_by`, `actor_type`, `reason`, `changed_at`).
