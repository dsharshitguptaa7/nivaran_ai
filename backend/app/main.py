from fastapi import FastAPI
from sqlalchemy import text

from app.db.database import engine
from app.api.auth import router as auth_router
from app.api.routes.grievances import router as grievances_router


app = FastAPI(
    title="NIVARAN-AI",
    description="AI-Assisted Grievance Redressal System",
    version="1.0.0",
)


# Authentication routes
app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    grievances_router,
    prefix="/api/v1",
)


@app.get("/")
def root():
    return {
        "message": "NIVARAN-AI Backend is running",
        "status": "success",
    }


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