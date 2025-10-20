"""Main FastAPI application."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from backend.config import settings
from backend.models import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting QBank API...")

    # Create directories if they don't exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.extracted_text_dir, exist_ok=True)
    os.makedirs(settings.generated_questions_dir, exist_ok=True)
    os.makedirs(settings.model_cache_dir, exist_ok=True)

    # Connect to database
    await db_manager.connect()

    yield

    # Shutdown
    print("Shutting down QBank API...")
    await db_manager.disconnect()


# Initialize FastAPI app
app = FastAPI(
    title="QBank API",
    description="LLM-powered Question Bank System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to QBank API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db_status = "connected" if db_manager.db is not None else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "environment": settings.environment
    }


# Import and include routers
from backend.api.routes import upload, questions, process

app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(process.router, prefix="/api/process", tags=["process"])

# Mount static files for generated questions
app.mount("/generated_questions", StaticFiles(directory="generated_questions"), name="generated_questions")
