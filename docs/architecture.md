# NIVARAN-AI — System Architecture & Layered Design

## 1. Architectural Philosophy

NIVARAN-AI is architected around the principles of **domain-driven separation of concerns**, **strict role-based security**, **human-in-the-loop AI validation**, and **high auditability**.

```text
                                 ┌─────────────────────────────────┐
                                 │         Client Browser          │
                                 │   React 18 + Vite SPA Client    │
                                 └────────────────┬────────────────┘
                                                  │
                                       HTTPS / REST API (JSON)
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │     API Gateway / Middleware    │
                                 │  CORS, Auth Bearer, Exceptions  │
                                 └────────────────┬────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
  ┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
  │      Auth & RBAC Layer       │ │    Business Service Layer    │ │      AI / ML Pipeline        │
  │ • OAuth2 Password Bearer     │ │ • Grievance Workflow Engine  │ │ • NLP Preprocessing          │
  │ • JWT Verification (HS256)   │ │ • Dynamic Forwarding/Routing │ │ • TF-IDF Vectorizer          │
  │ • Permission Decorators      │ │ • Document Request Engine    │ │ • Category Classifier        │
  │ • User Role Enforcement      │ │ • Notification & Email Svc   │ │ • Confidence Evaluation      │
  │                              │ │ • Dean Analytics Aggregator  │ │ • Override Audit Tracker     │
  └──────────────┬───────────────┘ └──────────────┬───────────────┘ └──────────────┬───────────────┘
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │     Data Persistence Layer      │
                                 │   SQLAlchemy 2.0 ORM + Alembic  │
                                 └────────────────┬────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │      PostgreSQL 14+ Database    │
                                 │  Users, Grievances, Logs, etc.  │
                                 └─────────────────────────────────┘
```

---

## 2. Layer-by-Layer Decomposition

### 2.1. Presentation Layer (Frontend SPA)
- **Framework**: React 18 using Vite for fast bundling and HMR.
- **Routing Engine**: React Router DOM v6 with a unified login architecture (`/login?type=authority`) and declarative protected routes (`ProtectedRoute.jsx`).
- **State Management**: React state hooks (`useState`, `useEffect`, `useCallback`) and specialized API service clients.
- **Visual Design System**: Custom CSJMU Brand Theme (Crimson `#5b1021`, Deep Navy `#1e293b`, Gold `#d4af37`, Emerald `#16a34a`).
- **Real-Time Notification Bell**: Centralized bell widget with unread count polling, quick mark-as-read, and full history views.

### 2.2. API Routing & Controller Layer (`app/api/`)
- **Framework**: FastAPI (ASGI asynchronous request handling).
- **Endpoint Structure**:
  - `/api/v1/auth`: Authentication, token generation, user profile (`/me`), scholar registration.
  - `/api/v1/grievances`: Grievance CRUD, AI category verification, status transitions, resolution, closure, document attachment.
  - `/api/v1/assignment`: Grievance assignment, forwarding, and escalation to higher deans.
  - `/api/v1/categories`: Category management and routing configuration inspection.
  - `/api/v1/subjects`: University subjects and clusters.
  - `/api/v1/documents`: Secure file uploads, metadata tracking, and byte-stream downloads.
  - `/api/v1/document-requests`: Formal authority document request lifecycle and review.
  - `/api/v1/notifications`: User-specific in-app notification center.
  - `/api/v1/dean`: High-level university workload matrix, attention items, and turnaround analytics.

### 2.3. Service & Workflow Layer (`app/services/`)
- **`grievance_workflow.py`**: State machine enforcing allowed grievance status transitions (`SUBMITTED` -> `AI_PROCESSING` -> `PENDING_REVIEW` -> `ASSIGNED` -> `IN_PROGRESS` -> `AWAITING_INFORMATION` -> `RESOLVED` -> `CLOSED` -> `REOPENED`).
- **`escalation_service.py`**: Handles cross-authority forwarding, escalating from Assistant Dean to Associate Dean and Dean, recording comprehensive audit trails.
- **`document_request_service.py`**: Orchestrates missing document requests, uploads, status pausing, and authority review approvals/rejections.
- **`notification_service.py`**: Multi-event in-app notification manager with automatic unread tracking.
- **`email_service.py`**: Centralized, non-blocking SMTP dispatcher rendering responsive HTML templates with duplicate-guarding logic.
- **`reminder_service.py`**: 3-day inactivity detector triggering reminder notifications for assigned authorities.
- **`dean_analytics_service.py`**: Real-time SQL aggregation engine calculating resolution turnaround times, officer workload distribution, and overdue bottlenecks.

### 2.4. AI / Machine Learning Engine (`app/ai/`)
- **`cluster_predictor.py` / `model_inference.py`**: Executes inference against pre-trained vectorizers and classifiers to assign grievances to academic domains with confidence scoring.
- **`ai_processing.py` (Model)**: Audits every prediction, recording predicted category, probability confidence, model execution time, and manager override actions.

### 2.5. Data Access & Persistence Layer (`app/db/` & `app/models/`)
- **ORM**: SQLAlchemy 2.0 with type-annotated mapped columns (`Mapped[...] = mapped_column(...)`).
- **Connection Pooling**: PostgreSQL connection pooling via `psycopg2`.
- **Migrations**: Alembic migration versions tracking schema changes incrementally.

---

## 3. Security Architecture

1. **Authentication**:
   - Passwords hashed using Bcrypt (`passlib[bcrypt]`).
   - JWT tokens generated with `HS256` HMAC encryption and configurable expiry (`ACCESS_TOKEN_EXPIRE_MINUTES`).
2. **Role-Based Access Control (RBAC)**:
   - Granular `Permission` enum mapped to `UserRole` (`APPLICANT`, `MANAGER`, `ASSISTANT_DEAN`, `ASSOCIATE_DEAN`, `DEAN`).
   - Dependency injection `require_permission(...)` validates caller authority on every protected route.
3. **Data Isolation**:
   - Applicants can only view, track, and upload documents to their own filed grievances.
   - Cross-user document downloads and unauthorized notification mutations return `403 FORBIDDEN`.
4. **Environment Isolation**:
   - Sensitive credentials (DB passwords, secret keys, SMTP passwords) are loaded via Pydantic `BaseSettings` (`app.core.config`) from `.env` files.
