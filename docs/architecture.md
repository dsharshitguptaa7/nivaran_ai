# NIVARAN-AI — System Architecture

## 1. Overview

NIVARAN-AI follows a modular layered architecture designed to separate
the presentation layer, API layer, authentication, business logic,
AI services, data access, storage, and infrastructure.

The architecture is designed to provide:

- Maintainability
- Scalability
- Security
- Testability
- Clear separation of concerns
- Independent AI service evolution
- Role-based access control
- Reliable database management
- Auditability
- Human-in-the-loop AI processing

---

# 2. High-Level Architecture

```text
                    ┌─────────────────────────┐
                    │         Users           │
                    │                         │
                    │ Applicant               │
                    │ Manager                 │
                    │ Assistant Dean          │
                    │ Associate Dean          │
                    │ Dean                    │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    ┌─────────────────────────┐
                    │       Frontend          │
                    │     Web Application     │
                    └────────────┬────────────┘
                                 │
                           HTTPS / REST
                                 │
                                 ↓
                    ┌─────────────────────────┐
                    │      FastAPI API        │
                    │     Application Layer   │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
             ↓                   ↓                   ↓
      Authentication &      Service Layer       AI Services
           RBAC                   │                   │
             │                   │                   │
             │          ┌────────┼────────┐          │
             │          │        │        │          │
             │          ↓        ↓        ↓          ↓
             │       Grievance Assignment  Workflow  AI Processing
             │          │        │        │          │
             └──────────┴────────┴────────┴──────────┘
                                 │
                                 ↓
                    ┌─────────────────────────┐
                    │      SQLAlchemy ORM    │
                    │       Data Access       │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    ┌─────────────────────────┐
                    │       PostgreSQL 18     │
                    │    nivaran_ai_database  │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ↓                                     ↓
      ┌───────────────────┐                ┌───────────────────┐
      │  File/Object      │                │   Audit &         │
      │     Storage       │                │   Notification    │
      │                   │                │     Systems       │
      └───────────────────┘                └───────────────────┘