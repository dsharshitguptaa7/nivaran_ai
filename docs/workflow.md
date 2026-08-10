# NIVARAN-AI — Grievance Workflow

## 1. Overview

NIVARAN-AI follows a structured, role-based grievance lifecycle.

The workflow starts when an Applicant submits a grievance and continues
through AI-assisted processing, administrative review, assignment,
investigation, escalation where required, resolution, and closure.

The system shall maintain:

- Current grievance status
- Complete status transition history
- Assignment history
- Escalation history
- Relevant comments and documents
- Notifications
- Audit records
- AI processing records

All workflow transitions shall be validated by the backend.

---

# 2. High-Level Workflow

The normal grievance lifecycle is:

```text
Applicant Submission
        ↓
SUBMITTED
        ↓
AI_PROCESSING
        ↓
PENDING_REVIEW
        ↓
ASSIGNED
        ↓
IN_PROGRESS
        ↓
RESOLVED
        ↓
CLOSED