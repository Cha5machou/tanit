from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import List, Union
import json


class Settings(BaseSettings):
    # Firebase Admin SDK
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_CLIENT_ID: str = ""
    FIREBASE_AUTH_URI: str = "https://accounts.google.com/o/oauth2/auth"
    FIREBASE_TOKEN_URI: str = "https://oauth2.googleapis.com/token"
    FIREBASE_SERVICE_ACCOUNT_PATH: str = ""
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    cors_origins_raw: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    
    # Environment
    ENVIRONMENT: str = "development"
    
    @field_validator("cors_origins_raw", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> str:
        """Parse CORS_ORIGINS from comma-separated string or list."""
        if isinstance(v, str):
            # Try to parse as JSON first (in case it's a JSON string)
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return ",".join(str(x) for x in parsed)
            except (json.JSONDecodeError, ValueError):
                # Not JSON, treat as comma-separated string
                pass
            return v
        elif isinstance(v, list):
            return ",".join(str(x) for x in v)
        else:
            return "http://localhost:3000"
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Get CORS_ORIGINS as a list."""
        if not self.cors_origins_raw:
            return ["http://localhost:3000"]
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        populate_by_name=True,  # Allow both field name and alias
    )


settings = Settings()

