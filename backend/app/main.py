from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import engine
from app.api.auth import router as auth_router
from app.api.routes.grievances import router as grievances_router
from app.api.routes.assignment import router as assignment_router
from app.api.routes.categories import router as categories_router
from app.api.routes.subjects import router as subjects_router
from app.api.routes.documents import router as documents_router
from app.api.routes.dean import router as dean_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.document_requests import router as document_requests_router


app = FastAPI(
    title="NIVARAN-AI",
    description="AI-Assisted Grievance Redressal System",
    version="1.0.0",
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# API ROUTES
# ==========================================

app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    grievances_router,
    prefix="/api/v1",
)

app.include_router(
    assignment_router,
    prefix="/api/v1",
)

app.include_router(
    categories_router,
    prefix="/api/v1",
)

app.include_router(
    subjects_router,
    prefix="/api/v1",
)

app.include_router(
    documents_router,
    prefix="/api/v1",
)

app.include_router(
    dean_router,
    prefix="/api/v1",
)

app.include_router(
    notifications_router,
    prefix="/api/v1",
)

app.include_router(
    document_requests_router,
    prefix="/api/v1",
)
# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():
    return {
        "message": "NIVARAN-AI Backend is running",
        "status": "success",
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
        }