# NIVARAN-AI — Database Schema

## 1. Database Technology

NIVARAN-AI uses PostgreSQL as its primary relational database.

### Database Name

`nivaran_ai_database`

### Database Engine

PostgreSQL 18

### ORM

SQLAlchemy

### Database Driver

psycopg2

### Database Migration

Alembic

---

# 2. Database Architecture

The application follows the following database architecture:

FastAPI
↓
Service Layer
↓
SQLAlchemy ORM
↓
psycopg2
↓
PostgreSQL

Database schema changes are managed through:

SQLAlchemy Models
↓
Alembic
↓
Migration Scripts
↓
PostgreSQL

---

# 3. Design Principles

The database design follows these principles:

- Relational data modeling
- Referential integrity
- Role-based access control
- Timestamped records
- Immutable audit history
- Normalized core entities
- Extensibility for AI features
- Controlled status transitions
- Soft deactivation where appropriate
- Version-controlled schema migrations
- Traceable AI processing
- Human-in-the-loop AI validation

---

# 4. Core Entities

The NIVARAN-AI database currently consists of the following entities:

1. Users
2. Categories
3. Clusters
4. Grievances
5. Assignments
6. Grievance Status History
7. Escalations
8. Documents
9. Comments
10. Notifications
11. Audit Logs
12. AI Processing Records

---

# 5. Entity Relationship Overview

```text
                         ┌──────────────┐
                         │    USERS     │
                         └──────┬───────┘
                                │
          ┌─────────────┬───────┼────────┬──────────────┐
          │             │       │        │              │
          ↓             ↓       ↓        ↓              ↓
    ASSIGNMENTS     COMMENTS  AUDIT   DOCUMENTS   NOTIFICATIONS
          │             │      LOGS        │
          │             │                  │
          └─────────────┴──────────┐       │
                                   ↓       │
                            ┌───────────────┐
                            │  GRIEVANCES   │
                            └───────┬───────┘
                                    │
             ┌──────────────┬───────┼────────┬───────────────┐
             │              │       │        │               │
             ↓              ↓       ↓        ↓               ↓
        CATEGORIES       CLUSTERS  STATUS  ESCALATIONS   DOCUMENTS
                                  HISTORY
                                    │
                                    ↓
                           AI PROCESSING RECORDS
                                    │
                                    ↓
                              CATEGORIES
                              / CLUSTERS