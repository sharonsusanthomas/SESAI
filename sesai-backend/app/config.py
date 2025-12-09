from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database Configuration
    MYSQL_HOST: str
    MYSQL_PORT: int = 3306
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_DATABASE: str
    
    # AI Configuration
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = "" # Optional if only using OpenAI, but required for Hybrid
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    
    # JWT Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Application Configuration
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Optional: Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct MySQL database URL"""
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"
    
    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        # Ensure 127.0.0.1 is also trusted for local dev
        extra_origins = ["http://127.0.0.1:5173", "http://127.0.0.1:3000"]
        for origin in extra_origins:
            if origin not in origins:
                origins.append(origin)
        return origins
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
