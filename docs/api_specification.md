# NIVARAN-AI — REST API Specification

**Base URL**: `/api/v1`  
**Authentication**: `Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Endpoints (`/auth`)

### `POST /auth/register`
- **Description**: Registers a new research scholar / applicant account.
- **Request Body**:
  ```json
  {
    "full_name": "Aditi Sharma",
    "email": "aditi.phd@univ.ac.in",
    "password": "SecurePassword123!",
    "department": "Computer Science & Engineering",
    "phd_registration_number": "CSJMU/PHD/2024/042",
    "subject_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
  ```
- **Response**: `201 Created` with user summary.

### `POST /auth/login`
- **Description**: OAuth2 password form login returning access JWT.
- **Content-Type**: `application/x-www-form-urlencoded`
- **Body**: `username=email&password=password`
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": {
      "id": "...",
      "email": "...",
      "full_name": "...",
      "role": "APPLICANT"
    }
  }
  ```

### `GET /auth/me`
- **Description**: Returns currently authenticated user profile and permissions.

---

## 2. Grievance Management Endpoints (`/grievances`)

### `POST /grievances`
- **Access**: `APPLICANT`
- **Description**: Creates a new grievance and queues AI inference task.
- **Request Body**:
  ```json
  {
    "title": "Delayed Fellowship Disbursement for Q3",
    "description": "My JRF fellowship contingency amount for the previous quarter has not been credited.",
    "priority": "HIGH"
  }
  ```
- **Response**: `201 Created` with initial status `SUBMITTED`.

### `GET /grievances`
- **Access**: Authenticated users.
- **Query Filters**: `status`, `priority`, `category_id`, `search`, `page`, `page_size`.
- **RBAC Filter**:
  - `APPLICANT`: Returns only own grievances.
  - `MANAGER`: Returns all grievances.
  - `ASSISTANT_DEAN` / `ASSOCIATE_DEAN`: Returns currently assigned and subject grievances.
  - `DEAN`: Returns all university grievances.

### `GET /grievances/{id}`
- **Description**: Returns detailed grievance payload including status history, documents, AI classification telemetry, and document request records.

### `POST /grievances/{id}/review-category`
- **Access**: `MANAGER`
- **Description**: Confirms or overrides AI prediction and triggers automated routing.
- **Request Body**:
  ```json
  {
    "final_category_id": "uuid",
    "remarks": "Verified scholarship category"
  }
  ```

### `POST /grievances/{id}/resolve`
- **Access**: Assigned Authority, Manager, Dean.
- **Description**: Marks grievance as `RESOLVED`.
- **Request Body**:
  ```json
  {
    "resolution_notes": "Fellowship arrears processed and approved via disbursement voucher #4082."
  }
  ```

### `POST /grievances/{id}/close`
- **Access**: `MANAGER`, `DEAN`.
- **Description**: Formally closes the grievance with administrative remarks.
- **Request Body**:
  ```json
  {
    "closure_remarks": "Bank transfer receipt verified against scholar ledger."
  }
  ```

### `POST /grievances/{id}/reopen`
- **Access**: `APPLICANT`, `MANAGER`.
- **Description**: Reopens a closed or resolved grievance if remedy was insufficient.

---

## 3. Assignment & Routing Endpoints (`/assignment`)

### `POST /assignment/forward`
- **Access**: `MANAGER`, `ASSISTANT_DEAN`, `ASSOCIATE_DEAN`.
- **Description**: Forwards grievance to the next tier officer (Assistant Dean $\to$ Associate Dean) with dynamic authority resolution.
- **Request Body**:
  ```json
  {
    "grievance_id": "uuid",
    "target_authority_id": "uuid",
    "remarks": "Forwarded to Associate Dean for Grievance Cluster review"
  }
  ```

### `POST /assignment/escalate`
- **Access**: `ASSOCIATE_DEAN`.
- **Description**: Escalates complex case to the Dean (R&D).

---

## 4. Document Requests & Files (`/document-requests` & `/documents`)

### `POST /grievances/{id}/document-requests`
- **Access**: Assigned Authority, Manager.
- **Description**: Requests missing supporting documentation from scholar.
- **Request Body**:
  ```json
  {
    "documents": [
      {
        "document_name": "Income Certificate",
        "description": "Original stamped income certificate for current financial year",
        "is_required": true
      }
    ],
    "deadline": "2026-09-01T23:59:59Z"
  }
  ```

### `POST /grievances/{id}/documents`
- **Description**: Uploads a document attachment or requested document.
- **Multipart Form**: `file` (binary), `document_type` (`ATTACHMENT` | `REQUESTED_DOCUMENT` | `RESOLUTION_PROOF`).

### `POST /document-requests/{id}/review`
- **Access**: Assigned Authority.
- **Description**: Approves or rejects an uploaded requested document.
- **Request Body**: `{"action": "APPROVE" | "REJECT", "remarks": "Clear image confirmed"}`

---

## 5. In-App Notifications (`/notifications`)

- `GET /notifications`: Returns paginated notification list for current user.
- `GET /notifications/unread-count`: Returns `{ "unread_count": int }` for bell badge.
- `PUT /notifications/{id}/read`: Marks single notification as read.
- `PUT /notifications/mark-all-read`: Marks all user notifications as read.
- `DELETE /notifications/{id}`: Deletes notification.

---

## 6. Dean Analytics & Workload Matrix (`/dean`)

- `GET /dean/analytics/summary`: University-wide KPI summary (total grievances, pending, resolved, closed, avg resolution time).
- `GET /dean/analytics/workload-matrix`: Detailed officer-by-officer workload matrix (`name`, `role`, `department_or_subject`, `assigned_count`, `pending_count`, `resolved_count`, `avg_resolution_hours`).
- `GET /dean/analytics/attention-grievances`: Returns stalled grievances and active escalations.
