"""
Pytest configuration and fixtures for API testing.

Uses a separate test database session for each test with proper isolation.
"""
from typing import AsyncGenerator
import os

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_async_db
from app.core.security import get_password_hash, create_access_token
from app.main import app
from app.models import User, UserRole, UserStatus, Utility, Space, SpaceStatus

# Disable rate limiting and encryption for tests
settings.ENABLE_RATE_LIMITING = False
settings.ENABLE_ENCRYPTION = False


def get_test_database_url() -> str:
    """Get test database URL (uses study_space_test database)."""
    return f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/study_space_test"


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a database session for each test with cleanup."""
    engine = create_async_engine(
        get_test_database_url(),
        echo=False,
        poolclass=NullPool,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    connection = await engine.connect()
    transaction = await connection.begin()
    session = session_factory(bind=connection)
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database override."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_async_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test student user."""
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        email=f"student_{unique_id}@test.com",
        password_hash=get_password_hash("password123"),
        full_name="Test Student",
        student_id=f"STU_{unique_id}",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    admin = User(
        email=f"admin_{unique_id}@test.com",
        password_hash=get_password_hash("admin123"),
        full_name="Test Admin",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db_session.add(admin)
    await db_session.flush()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def test_lecturer(db_session: AsyncSession) -> User:
    """Create a test lecturer user."""
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    lecturer = User(
        email=f"lecturer_{unique_id}@test.com",
        password_hash=get_password_hash("lecturer123"),
        full_name="Test Lecturer",
        role=UserRole.LECTURER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(lecturer)
    await db_session.flush()
    await db_session.refresh(lecturer)
    return lecturer


@pytest_asyncio.fixture
async def user_token(test_user: User) -> str:
    """Generate JWT token for test user."""
    return create_access_token(subject=test_user.id)


@pytest_asyncio.fixture
async def admin_token(test_admin: User) -> str:
    """Generate JWT token for test admin."""
    return create_access_token(subject=test_admin.id)


@pytest_asyncio.fixture
async def lecturer_token(test_lecturer: User) -> str:
    """Generate JWT token for test lecturer."""
    return create_access_token(subject=test_lecturer.id)


@pytest_asyncio.fixture
async def auth_headers(user_token: str) -> dict:
    """Auth headers for regular user."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest_asyncio.fixture
async def admin_headers(admin_token: str) -> dict:
    """Auth headers for admin user."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def lecturer_headers(lecturer_token: str) -> dict:
    """Auth headers for lecturer user."""
    return {"Authorization": f"Bearer {lecturer_token}"}


@pytest_asyncio.fixture
async def test_utilities(db_session: AsyncSession) -> list[Utility]:
    """Create test utilities with unique keys."""
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    utilities = [
        Utility(key=f"wifi_{unique_id}", label="WiFi", description="Wireless internet"),
        Utility(key=f"ac_{unique_id}", label="Air Conditioning", description="Climate control"),
        Utility(key=f"whiteboard_{unique_id}", label="Whiteboard", description="Writing board"),
    ]
    for u in utilities:
        db_session.add(u)
    await db_session.flush()
    for u in utilities:
        await db_session.refresh(u)
    return utilities


@pytest_asyncio.fixture
async def test_space(db_session: AsyncSession) -> Space:
    """Create a test space."""
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    space = Space(
        name=f"Test Room {unique_id}",
        building=f"Test Building {unique_id}",
        floor="1",
        location="Near entrance",
        capacity=10,
        status=SpaceStatus.ACTIVE,
    )
    db_session.add(space)
    await db_session.flush()
    await db_session.refresh(space)
    return space
