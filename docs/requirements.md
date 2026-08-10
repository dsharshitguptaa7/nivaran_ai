# NIVARAN-AI — System Requirements

## 1. Project Overview

NIVARAN-AI is an AI-Assisted Grievance Redressal System designed to digitally receive, process, categorize, route, track, and resolve grievances submitted to the Research and Development (R&D) administration.

The system aims to replace fragmented/manual grievance handling with a centralized, transparent, role-based, and auditable digital workflow.

AI will assist in grievance categorization, subject/cluster identification, and routing recommendations while keeping important administrative decisions under authorized human control.

---

## 2. Problem Statement

The existing grievance handling process may involve manual submission, communication, assignment, follow-up, escalation, and record maintenance.

This can lead to:

- Delayed grievance processing
- Difficulty tracking pending cases
- Manual categorization and routing
- Lack of centralized records
- Limited visibility for applicants
- Difficulty monitoring escalation
- Lack of a complete audit trail
- Difficulty generating management-level reports

NIVARAN-AI addresses these problems through a centralized digital grievance management platform with AI-assisted processing.

---

## 3. Objectives

The primary objectives of NIVARAN-AI are:

1. Digitize the grievance submission and management process.
2. Generate a unique grievance ID for every submitted grievance.
3. Automatically assist in grievance categorization using AI.
4. Identify related subjects or clusters of grievances.
5. Support intelligent routing recommendations.
6. Allow authorized managers to assign grievances.
7. Support hierarchical grievance escalation.
8. Enable document and file exchange.
9. Allow applicants to track grievance status.
10. Provide dashboards for R&D administration and leadership.
11. Provide automated reminders for pending grievances.
12. Maintain a timestamped audit trail of important actions.
13. Centralize grievance records and communication.
14. Improve transparency and accountability.
15. Provide data that can support future analysis and research.

---

# 4. Users and Roles

NIVARAN-AI supports the following primary roles:

- Applicant
- Manager
- Assistant Dean
- Associate Dean
- Dean

Each role will have controlled permissions based on the responsibilities defined in the system's RBAC policy.

Detailed permissions will be documented separately in:

`roles_permissions.md`

---

# 5. Functional Requirements

## 5.1 User Authentication

The system shall:

- Allow users to securely authenticate.
- Validate user credentials.
- Maintain authenticated sessions/tokens.
- Identify the role of the authenticated user.
- Restrict access to authorized resources.
- Prevent unauthorized access to grievance information.

---

## 5.2 Role-Based Access Control

The system shall implement Role-Based Access Control (RBAC).

Access to:

- Grievances
- Documents
- Assignments
- Escalations
- Dashboards
- Administrative actions
- Audit information

shall depend on the authenticated user's role and permissions.

---

## 5.3 Grievance Submission

Applicants shall be able to:

- Submit a new grievance.
- Provide grievance title/subject.
- Provide detailed grievance description.
- Select/provide relevant information required by the system.
- Attach supporting documents where applicable.
- Submit the grievance digitally.

After successful submission, the system shall generate a unique grievance ID.

---

## 5.4 Grievance Identification

Every grievance shall have:

- A unique grievance ID.
- Submission timestamp.
- Current status.
- Applicant information.
- Assigned/handling authority where applicable.
- Relevant category/cluster information.

The grievance ID shall be used for tracking and reference.

---

# 6. AI-Assisted Grievance Processing

NIVARAN-AI shall provide AI assistance for grievance processing.

The AI subsystem may assist with:

- Text preprocessing
- Grievance categorization
- Subject identification
- Similarity detection
- Cluster identification
- Routing recommendations

The AI system shall not automatically make sensitive administrative decisions without appropriate human oversight.

The detailed AI architecture shall be documented in:

`ai_architecture.md`

---

# 7. Grievance Categorization

The system shall support automatic or AI-assisted categorization of grievances.

The categorization pipeline may use:

1. Grievance text
2. Text preprocessing
3. Feature/embedding generation
4. Classification or clustering
5. Category/subject identification
6. Confidence/relevance information
7. Human verification where required

The system should allow authorized personnel to correct an AI-generated category.

Such corrections may be stored for future system improvement.

---

# 8. Subject and Cluster Identification

The system shall support identification of groups/clusters of related grievances.

The clustering system should help identify:

- Common grievance subjects
- Similar grievances
- Emerging grievance patterns
- Frequently occurring issues
- Related cases

Cluster information may be used to support routing, dashboards, analytics, and administrative decision-making.

---

# 9. Grievance Assignment

Authorized users shall be able to assign grievances to appropriate handling authorities.

The assignment system shall record:

- Grievance
- Assignee
- Assigning user
- Assignment timestamp
- Assignment status
- Relevant remarks where applicable

Assignment actions shall be recorded in the audit trail.

---

# 10. Escalation Workflow

The system shall support hierarchical escalation of grievances.

The workflow shall support escalation through:

Applicant
→ Manager
→ Assistant Dean
→ Associate Dean
→ Dean

Actual escalation rules, authority, conditions, and status transitions shall be defined in:

`workflow.md`

The system shall record escalation events with timestamps and responsible users.

---

# 11. Grievance Status Tracking

Each grievance shall maintain a current status.

The system shall allow authorized users to update grievance status according to defined workflow rules.

Applicants shall be able to view the status of their own grievances.

The system should maintain historical status information so that previous states and transitions can be reviewed.

---

# 12. Document and File Management

The system shall support document exchange related to grievances.

Users with appropriate permissions shall be able to:

- Upload documents.
- Download authorized documents.
- Associate documents with grievances.
- View document metadata.
- Exchange supporting files where permitted.

File access shall follow role-based authorization.

---

# 13. Notifications and Reminders

The system shall support notifications related to grievance processing.

Notifications may be generated for:

- Grievance submission
- Assignment
- Status changes
- Escalation
- Additional information requests
- Resolution
- Closure
- Pending actions
- Reminder events

The notification mechanism may support future integration with email or other notification channels.

---

# 14. Pending Grievance Monitoring

The system shall identify grievances that remain pending.

Authorized users shall be able to:

- View pending grievances.
- Filter pending grievances.
- Identify overdue cases.
- Monitor processing duration.
- Take appropriate follow-up actions.

---

# 15. Audit Trail

The system shall maintain a timestamped audit trail of important actions.

Audit information may include:

- User performing the action
- Action type
- Related grievance
- Previous state where applicable
- New state where applicable
- Timestamp
- Relevant metadata

Audit records should provide traceability of grievance processing.

---

# 16. Applicant Portal

Applicants shall have access to a dedicated interface through which they can:

- Submit grievances.
- View submitted grievances.
- Track grievance status.
- View authorized updates.
- Upload supporting documents.
- Access authorized documents.
- Receive relevant notifications.

Applicants shall only be able to access information they are authorized to view.

---

# 17. Management Dashboard

The system shall provide dashboards for authorized R&D personnel.

Dashboard capabilities may include:

- Total grievances received
- Pending grievances
- Resolved grievances
- Closed grievances
- Category-wise grievance counts
- Subject/cluster-wise distribution
- Assignment statistics
- Escalation statistics
- Processing/response time
- Overdue grievances
- Trend analysis

Dashboard visibility shall depend on the user's role.

---

# 18. Search and Filtering

Authorized users shall be able to search and filter grievances using relevant attributes such as:

- Grievance ID
- Applicant
- Category
- Subject/cluster
- Status
- Assigned user
- Date
- Priority where applicable
- Escalation level where applicable

Search results shall respect role-based access restrictions.

---

# 19. Data Management

The system shall maintain centralized records for:

- Users
- Grievances
- Categories
- Clusters
- Assignments
- Status history
- Documents
- Notifications
- Audit records

The exact database schema shall be defined in:

`database_schema.md`

---

# 20. Security Requirements

The system shall:

- Protect user credentials.
- Store passwords using secure password hashing.
- Use authenticated API access.
- Enforce role-based authorization.
- Protect sensitive grievance information.
- Validate uploaded files.
- Prevent unauthorized document access.
- Maintain secure database access.
- Keep secrets and credentials outside source code.
- Maintain audit records for important administrative actions.

---

# 21. Data Integrity

The system shall maintain consistency between:

- Grievances
- Users
- Assignments
- Status history
- Escalations
- Documents
- Notifications
- Audit records

Database constraints and application-level validation shall be used to maintain data integrity.

---

# 22. API Requirements

The backend shall expose REST APIs for communication between the frontend and backend.

The API layer shall support functionality related to:

- Authentication
- Users
- Grievances
- Assignments
- Escalations
- Documents
- Notifications
- Dashboards
- Audit records
- AI-assisted processing

Detailed API endpoints, request formats, response formats, and authorization requirements shall be documented in:

`api_specification.md`

---

# 23. AI System Requirements

The AI subsystem should be designed to support:

- NLP-based grievance understanding
- Text embeddings
- Categorization
- Clustering
- Similarity analysis
- Routing recommendations
- Model evaluation
- Future model retraining

The architecture should allow the AI component to evolve independently from the main application.

Detailed AI requirements and architecture shall be documented in:

`ai_architecture.md`

---

# 24. Non-Functional Requirements

## 24.1 Performance

The system should provide responsive API and user-interface interactions under expected institutional workload.

AI processing should be designed so that it does not unnecessarily block normal grievance submission.

---

## 24.2 Scalability

The architecture should allow future expansion in:

- Number of users
- Number of grievances
- Number of departments
- AI models
- Notification channels
- Dashboard capabilities

---

## 24.3 Reliability

The system should:

- Handle failures gracefully.
- Preserve important grievance records.
- Prevent accidental loss of submitted information.
- Maintain database consistency.

---

## 24.4 Maintainability

The system should use:

- Modular backend architecture
- Clear separation of concerns
- Version-controlled database migrations
- Reusable services
- Documented APIs
- Testable components

---

## 24.5 Auditability

Important administrative and grievance-processing actions shall be traceable through the audit trail.

---

## 24.6 Usability

The system should provide role-specific interfaces that are simple and understandable for applicants and administrative users.

---

# 25. Technology Foundation

The current backend technology foundation is:

- Python
- FastAPI
- Uvicorn
- PostgreSQL
- SQLAlchemy
- psycopg2
- Alembic

The frontend and AI technology stack may be finalized according to the architecture and implementation requirements.

---

# 26. System Architecture Overview

The high-level system flow is:

Frontend
↓
FastAPI REST API
↓
Authentication / RBAC
↓
Service Layer
↓
AI Services
↓
SQLAlchemy ORM
↓
PostgreSQL

Database schema migrations are managed through:

SQLAlchemy Models
↓
Alembic
↓
PostgreSQL

---

# 27. Documentation Dependencies

The project requirements defined in this document serve as the foundation for the following documents:

- `roles_permissions.md`
- `workflow.md`
- `database_schema.md`
- `api_specification.md`
- `architecture.md`
- `ai_architecture.md`

Any major functional change should first be reflected in the relevant documentation before implementation.

---

# 28. Requirement Status

Current implementation status:

- [x] Project repository setup
- [x] Backend project structure
- [x] FastAPI application
- [x] PostgreSQL installation
- [x] Application database creation
- [x] SQLAlchemy configuration
- [x] Environment configuration
- [x] Database connectivity
- [x] Alembic initialization
- [x] Alembic database connectivity
- [ ] User model
- [ ] Authentication
- [ ] Role-Based Access Control
- [ ] Grievance management
- [ ] Assignment workflow
- [ ] Escalation workflow
- [ ] Document management
- [ ] Notifications
- [ ] Audit trail
- [ ] AI categorization
- [ ] AI clustering
- [ ] Dashboards
- [ ] Frontend integration
- [ ] Testing
- [ ] Deployment