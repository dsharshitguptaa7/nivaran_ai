# NIVARAN-AI — API Specification

## 1. Overview

NIVARAN-AI exposes REST APIs through the FastAPI backend.

Base URL:

`/api/v1`

The API follows:

- RESTful endpoint conventions
- JSON request/response formats where applicable
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Workflow validation
- Resource-level authorization

---

# 2. API Architecture

```text
Frontend
    ↓
REST API
    ↓
Authentication
    ↓
Authorization / RBAC
    ↓
Service Layer
    ↓
Database / AI Services