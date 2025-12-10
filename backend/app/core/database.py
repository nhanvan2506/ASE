from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase
from typing import AsyncGenerator
import ssl

from app.core.config import settings

# SSL configuration for asyncpg (cloud providers like Neon/Supabase require SSL)
connect_args = {}
if settings.POSTGRES_SSL_MODE != "disable":
    # Supabase requires SSL connection but may have certificate issues
    # For development, we can disable certificate verification
    # In production, you should use proper SSL certificates
    ssl_context = ssl.create_default_context()
    if settings.POSTGRES_SSL_MODE in ["require", "prefer"]:
        # Disable certificate verification for development
        # WARNING: This is not secure for production!
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

async_engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    echo=False,  # Set to False in production
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Base class for all models
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


# Dependency for FastAPI endpoints (async)
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides an async database session to FastAPI endpoints.
    
    Usage in FastAPI:
        @app.get("/items")
        async def read_items(db: AsyncSession = Depends(get_async_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
