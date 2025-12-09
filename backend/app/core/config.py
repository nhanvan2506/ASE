from dotenv import load_dotenv, find_dotenv
from pydantic_settings import BaseSettings
import secrets
from urllib.parse import quote_plus

load_dotenv(find_dotenv(".env"), override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Study Space"
    PROJECT_VERSION: str = "1.0.0"
    # Feature flags
    ENABLE_AUDIT_LOGS: bool = False

    # JWT Settings
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database Settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "study_space"
    # SSL mode for cloud databases (e.g., Supabase). Options: disable, require, verify-ca, verify-full
    POSTGRES_SSL_MODE: str = "disable"
    
    @property
    def DATABASE_URL(self) -> str:
        """Synchronous database URL for SQLAlchemy (using psycopg)"""
        # URL encode user and password to handle special characters
        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        db_name = quote_plus(self.POSTGRES_DB)
        url = f"postgresql+psycopg://{user}:{password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{db_name}"
        if self.POSTGRES_SSL_MODE != "disable":
            url += f"?sslmode={self.POSTGRES_SSL_MODE}"
        return url
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Asynchronous database URL for SQLAlchemy (using asyncpg)"""
        # URL encode user and password to handle special characters
        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        db_name = quote_plus(self.POSTGRES_DB)
        url = f"postgresql+asyncpg://{user}:{password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{db_name}"
        if self.POSTGRES_SSL_MODE != "disable":
            url += f"?ssl=require"
        return url

    class Config:
        case_sensitive = True
        env_file = ".env"


    
settings = Settings()
