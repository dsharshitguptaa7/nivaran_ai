# NIVARAN-AI (निवारण-AI)
### AI-Assisted Research Scholar & Student Grievance Redressal System
**Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur — R&D Section**

---

## 📌 1. Project Overview

**NIVARAN-AI** is an enterprise-grade, AI-assisted grievance redressal and workflow automation platform purpose-built for university research scholars, students, and administrative authorities (R&D Section, CSJMU).

The system streamlines the entire grievance management lifecycle:
1. **Intelligent Intake & Submission**: Research scholars register and file grievances with subject mapping and supporting evidence attachments.
2. **AI-Powered Category Prediction**: Machine Learning / NLP models analyze grievance text, predict categories, calculate confidence scores, and cluster grievances automatically.
3. **Manager Human-in-the-Loop Review**: University Managers review, verify, or override AI predictions before dispatching cases.
4. **Automated Multi-Tier Routing**:
   - **Case 1: Subject Assistant Dean Routing** — Directly resolved by the subject-specialist Assistant Dean based on scholar academic discipline.
   - **Case 2: Grievance Cluster Routing** — Routed through the Subject Assistant Dean to the mapped Associate Dean according to the grievance domain cluster.
   - **Case 3: Fixed Authority Routing** — Dispatched to a dedicated specialized authority without unnecessary intermediate forwarding.
5. **Interactive Document Request Loop**: Authorities can dynamically request missing documents; grievances pause in `AWAITING_INFORMATION` and resume automatically when scholars upload required files.
6. **Centralized In-App & Email Notifications**: Bell icon notification center across 14 lifecycle event types, paired with responsive branded email alerts on critical events (`DOCUMENT_REQUESTED`, `GRIEVANCE_RESOLVED`, `GRIEVANCE_CLOSED`).
7. **3-Day Inactivity Reminder Engine**: Automated detection and alerting for pending grievances with no action for $\ge 3$ days.
8. **Dean High-Level Analytics & Workload Matrix**: Real-time university-wide resolution metrics, turnaround times, and officer workload distribution.

---

## 🏛️ 2. Role-Based Access Hierarchy

```text
                  ┌───────────────────────────────┐
                  │          DEAN (R&D)           │
                  │  Executive Analytics, Matrix, │
                  │     Escalation Resolution     │
                  └──────────────┬────────────────┘
                                 │
                  ┌──────────────┴────────────────┐
                  │       ASSOCIATE DEANS         │
                  │  Grievance Cluster Oversight, │
                  │    Escalations, Resolution    │
                  └──────────────┬────────────────┘
                                 │
                  ┌──────────────┴────────────────┐
                  │       ASSISTANT DEANS         │
                  │   Subject-Specific Review,    │
                  │   Doc Requests, Resolution    │
                  └──────────────┬────────────────┘
                                 │
                  ┌──────────────┴────────────────┐
                  │        MANAGER (R&D)          │
                  │  AI Verification, Forwarding, │
                  │  Resolution Review & Closure  │
                  └──────────────┬────────────────┘
                                 │
                  ┌──────────────┴────────────────┐
                  │     APPLICANTS / SCHOLARS     │
                  │  Grievance Filing, Tracking,  │
                  │   Doc Uploads, History Review │
                  └───────────────────────────────┘
```

---

## 🛠️ 3. Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Database**: SQLAlchemy 2.0 + PostgreSQL with `psycopg2`
- **Database Migrations**: Alembic
- **Security & Auth**: OAuth2 Password Bearer + JWT (JSON Web Tokens), Passlib (Bcrypt)
- **AI & NLP Pipeline**: Scikit-Learn (TF-IDF Vectorization, Multinomial Naive Bayes / Random Forest Classifier, Cosine Similarity)
- **Email Delivery**: SMTP via Python Standard `email` + `smtplib` with responsive HTML templates
- **Server**: Uvicorn ASGI

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Modern CSS3 Custom Design System (CSJMU Crimson `#5b1021`, Navy `#1e293b`, Gold `#d4af37`)
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **Build Tool**: Vite (Rollup production bundle)

---

## 📁 4. Repository Structure

```text
NIVARAN-AI/
├── docs/                               # Comprehensive Project Documentation
│   ├── architecture.md                 # System Architecture & Layered Design
│   ├── workflow.md                     # Grievance Routing & Resolution Workflows
│   ├── ai_architecture.md              # AI Classification Engine & NLP Model
│   ├── database_schema.md              # Database Schema & Entity Relationships
│   ├── api_specification.md            # REST API Endpoints & Request/Response
│   ├── roles_permissions.md            # RBAC & Security Permission Matrix
│   ├── notification_and_email.md       # In-App & Email Notification System
│   ├── deployment.md                   # Production Deployment & Hosting Guide
│   └── testing_strategy.md             # Automated Testing & Verification Suite
├── backend/
│   ├── app/
│   │   ├── ai/                         # AI models, inference, and classification
│   │   ├── api/                        # REST API routes (auth, grievances, dean, etc.)
│   │   ├── core/                       # App settings, security, permissions, JWT
│   │   ├── db/                         # Database session and base configuration
│   │   ├── models/                     # SQLAlchemy ORM models (19 models)
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── services/                   # Business logic, workflow, email, reminder
│   │   └── templates/emails/           # Responsive HTML email templates
│   ├── alembic/                        # Database migration revisions
│   ├── scripts/                        # Database seeding & bootstrapping scripts
│   ├── storage/documents/              # Uploaded grievance attachments
│   ├── tests/                          # Automated test suites (7 test files)
│   ├── .env.example                    # Backend environment template
│   └── requirements.txt                # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── assets/                     # Logos, illustrations, static assets
│   │   ├── components/                 # Reusable UI components (Modals, Badges, Cards)
│   │   ├── pages/                      # Page components (Dashboards, Detail Views, Login)
│   │   ├── services/                   # API clients & service wrappers
│   │   ├── App.jsx                     # Route definitions & protected routes
│   │   ├── main.jsx                    # React root entrypoint
│   │   └── index.css                   # University theme custom CSS design system
│   ├── .env.example                    # Frontend environment template
│   ├── package.json                    # Node dependencies & scripts
│   └── vite.config.js                  # Vite configuration
├── database/                           # Raw SQL schema & seed files
├── ml/                                 # Datasets & ML training notebooks
└── README.md                           # Master Project Documentation
```

---

## ⚡ 5. Quick Start (Local Development Setup)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 14+

### 1. Backend Setup
```powershell
cd c:\Projects\NIVARAN-AI\backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials (e.g. DATABASE_URL)

# Run database migrations
alembic upgrade head

# (Optional) Seed initial categories and university officers
python scripts/seed_categories.py
python scripts/seed_subjects.py
python scripts/seed_assistant_deans.py
python scripts/seed_associate_deans.py
python scripts/seed_category_routing.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```powershell
cd c:\Projects\NIVARAN-AI\frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 6. Automated Testing & Verification

Run the full suite of automated verification tests:

```powershell
cd c:\Projects\NIVARAN-AI\backend

# 1. E2E Grievance Workflow & Routing Pipeline
venv\Scripts\python.exe tests/test_grievance_pipeline_e2e.py

# 2. Email Notification System (All 9 Lifecycle Scenarios)
venv\Scripts\python.exe tests/test_email_notification_system.py

# 3. Centralized In-App Notification Center
venv\Scripts\python.exe tests/test_notification_system.py

# 4. 3-Day Inactivity Reminder Engine & Duplicate Guard
venv\Scripts\python.exe tests/test_reminder_feature.py

# 5. Additional Document Request & Re-upload Lifecycle
venv\Scripts\python.exe tests/test_document_request_system.py

# 6. Dean Analytics & Workload Matrix
venv\Scripts\python.exe tests/test_dean_analytics.py

# 7. API Endpoints & Background Task Processing
venv\Scripts\python.exe tests/test_api_endpoints.py
```

---

## 📄 7. License & Accreditation
Developed for **Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**.  
Research & Development Section — All rights reserved.
