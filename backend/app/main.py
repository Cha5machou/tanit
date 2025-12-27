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

from app.api.routes import auth, ai, monitoring

app = FastAPI(
    title="City Platform API",
    description="API pour la plateforme culturelle",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])


@app.get("/")
async def root():
    return {"message": "City Platform API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

