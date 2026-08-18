from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.api.auth import router as auth_router
from app.api.routes.grievances import router as grievances_router
from app.api.routes.assignment import router as assignment_router
from app.api.routes.categories import router as categories_router


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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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