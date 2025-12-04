from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api import auth, materials, notes, quiz, analytics, tutor
import os

# Allow OAuth over HTTP for development
if settings.ENVIRONMENT == "development":
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Create FastAPI application
app = FastAPI(
    title="SESAI API",
    description="AI-powered student learning assistant backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])
app.include_router(notes.router, prefix="/api/notes", tags=["Smart Notes"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(tutor.router, prefix="/api/tutor", tags=["AI Tutor"])


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("✅ Database initialized")
    print(f"✅ SESAI API running in {settings.ENVIRONMENT} mode")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SESAI API v1.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
