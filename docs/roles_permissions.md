# NIVARAN-AI — Roles and Permissions

## 1. Overview

NIVARAN-AI uses Role-Based Access Control (RBAC) to control access to
grievances, documents, assignments, escalations, dashboards,
notifications, AI recommendations, and administrative operations.

Every authenticated user is assigned exactly one primary application role.

The system shall enforce permissions at the backend/API level.
Frontend restrictions alone shall not be considered sufficient for security.

Authorization shall depend on:

- User authentication
- User role
- Required permission
- Resource ownership/access scope
- Current grievance status
- Workflow rules

---

# 2. System Roles

NIVARAN-AI defines the following primary roles:

1. Applicant
2. Manager
3. Assistant Dean
4. Associate Dean
5. Dean

Corresponding database enum values are:

```text
APPLICANT
MANAGER
ASSISTANT_DEAN
ASSOCIATE_DEAN
DEAN