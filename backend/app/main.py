from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.security import init_firebase

# Initialize Firebase Admin SDK before importing routes
try:
    init_firebase()
except Exception as e:
    print(f"Warning: Firebase initialization failed: {e}")
    print("Make sure Firebase credentials are configured in .env file")

from app.api.routes import auth, ai, monitoring, analytics, ai_analytics, poi, routing, ads, quiz

app = FastAPI(
    title="City Platform API",
    description="API pour la plateforme culturelle",
    version="0.1.0",
)

# CORS middleware
# For streaming responses, we need to ensure CORS headers are properly set
# Use wildcard "*" for allow_origins if empty list, but prefer explicit origins
cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
app.include_router(ai_analytics.router, prefix="/api/v1", tags=["ai-analytics"])
app.include_router(poi.router, prefix="/api/v1", tags=["poi"])
app.include_router(routing.router, prefix="/api/v1", tags=["routing"])
app.include_router(ads.router, prefix="/api/v1", tags=["ads"])
app.include_router(quiz.router, prefix="/api/v1", tags=["quiz"])


@app.get("/")
async def root():
    return {"message": "City Platform API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

