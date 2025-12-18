from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, sites

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
app.include_router(sites.router, prefix="/api/v1/sites", tags=["sites"])


@app.get("/")
async def root():
    return {"message": "City Platform API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

