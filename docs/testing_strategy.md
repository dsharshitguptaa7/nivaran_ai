# NIVARAN-AI — Testing & Verification Strategy

## 1. Testing Philosophy

NIVARAN-AI adheres to a multi-tiered automated testing pyramid designed to ensure zero workflow regressions, data isolation integrity, and complete lifecycle coverage.

```text
               ┌──────────────────────────────┐
               │    End-to-End Workflow Tests  │
               │   (4 Full Pipeline Scenarios)│
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴───────────────┐
               │     Subsystem Feature Suites │
               │ • Email System (9 Scenarios) │
               │ • In-App Notif (5 Scenarios) │
               │ • Reminder Engine (10 Tests) │
               │ • Document Requests (5 Tests)│
               │ • Dean Workload Analytics    │
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴───────────────┐
               │   Integration & API Tests    │
               │ • FastAPI TestClient Routes  │
               │ • Authentication & Bearer    │
               └──────────────────────────────┘
```

---

## 2. Automated Test Catalog

| Test File | Target Subsystem | Key Scenarios Verified |
|---|---|---|
| [`test_grievance_pipeline_e2e.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_grievance_pipeline_e2e.py) | Complete Grievance Pipeline | 1. Grievance Cluster flow & Manager closure.<br>2. Subject Assistant Dean direct resolution.<br>3. Escalation to Dean & executive closure.<br>4. Document upload & resolution proof attachment. |
| [`test_email_notification_system.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_email_notification_system.py) | Email & Inactivity Subsystem | 1. Document Request email dispatch.<br>2. Document upload suppression for applicant.<br>3. Grievance resolution email.<br>4. Duplicate resolve prevention.<br>5. Grievance closure email.<br>6. Forwarding email suppression.<br>7. AI review email suppression.<br>8. 3-day inactivity reminder internal isolation.<br>9. SMTP failure resilience (no 500 error). |
| [`test_notification_system.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_notification_system.py) | In-App Notification Center | 1. Notification creation and tracking.<br>2. Unread count serialization.<br>3. Single & mark-all-as-read operations.<br>4. Cross-user data isolation.<br>5. Full coverage across all 14 notification types. |
| [`test_reminder_feature.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_reminder_feature.py) | 3-Day Inactivity Engine | 1. Inactivity threshold calculation ($\ge 3$ days).<br>2. Active assignment resolution.<br>3. Duplicate prevention on consecutive runs.<br>4. Inactivity cycle reset after new action recorded. |
| [`test_document_request_system.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_document_request_system.py) | Additional Documents Loop | 1. Authority document request initiation.<br>2. State pausing in `AWAITING_INFORMATION`.<br>3. Automatic restoration to `ASSIGNED` / `IN_PROGRESS`.<br>4. Partial vs. complete required upload handling.<br>5. Authority document approval & rejection re-upload loop. |
| [`test_dean_analytics.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_dean_analytics.py) | Dean Dashboard Analytics | 1. Workload matrix aggregation across all 15 officers.<br>2. Average turnaround calculation in hours.<br>3. Attention grievances and stalled items. |
| [`test_api_endpoints.py`](file:///c:/Projects/NIVARAN-AI/backend/tests/test_api_endpoints.py) | Core REST Controllers | 1. Scholar intake & background AI task scheduling.<br>2. Document upload streaming.<br>3. Status transition endpoints. |

---

## 3. Running Test Suites

Execute all tests locally from the backend root:

```powershell
cd c:\Projects\NIVARAN-AI\backend

# Run complete test catalog
venv\Scripts\python.exe tests/test_grievance_pipeline_e2e.py
venv\Scripts\python.exe tests/test_email_notification_system.py
venv\Scripts\python.exe tests/test_notification_system.py
venv\Scripts\python.exe tests/test_reminder_feature.py
venv\Scripts\python.exe tests/test_document_request_system.py
venv\Scripts\python.exe tests/test_dean_analytics.py
venv\Scripts\python.exe tests/test_api_endpoints.py
```

### Clean Teardown Guarantee
Each test suite automatically provisions isolated temporary fixtures with random UUID prefixes and executes deterministic database teardown in a `finally:` block, ensuring **zero test data pollution** in production or local environments.
