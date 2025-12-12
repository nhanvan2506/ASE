"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient

from app.models import User


class TestRegister:
    """Tests for POST /auth/register"""

    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post("/auth/register", json={
            "email": "newuser@test.com",
            "password": "password123",
            "full_name": "New User",
            "student_id": "STU999",
            "department": "Computer Science",
            "year_of_study": 3,
        })

        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "newuser@test.com"
        assert data["user"]["full_name"] == "New User"
        assert data["user"]["role"] == "student"
        assert data["user"]["status"] == "active"

    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test registration with existing email fails."""
        response = await client.post("/auth/register", json={
            "email": test_user.email,
            "password": "password123",
            "full_name": "Another User",
        })

        assert response.status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email fails."""
        response = await client.post("/auth/register", json={
            "email": "invalid-email",
            "password": "password123",
            "full_name": "Test User",
        })

        assert response.status_code == 422

    async def test_register_short_password(self, client: AsyncClient):
        """Test registration with short password fails."""
        response = await client.post("/auth/register", json={
            "email": "user@test.com",
            "password": "short",
            "full_name": "Test User",
        })

        assert response.status_code == 422


class TestLogin:
    """Tests for POST /auth/login"""

    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login."""
        response = await client.post("/auth/login", json={
            "email": test_user.email,
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == test_user.email

    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password fails."""
        response = await client.post("/auth/login", json={
            "email": test_user.email,
            "password": "wrongpassword",
        })

        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent email fails."""
        response = await client.post("/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "password123",
        })

        assert response.status_code == 401


class TestLoginForm:
    """Tests for POST /auth/login/form (OAuth2 compatibility)"""

    async def test_login_form_success(self, client: AsyncClient, test_user: User):
        """Test successful login using OAuth2 form."""
        response = await client.post("/auth/login/form", data={
            "username": test_user.email,
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == test_user.email

    async def test_login_form_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login form with wrong password fails."""
        response = await client.post("/auth/login/form", data={
            "username": test_user.email,
            "password": "wrongpassword",
        })

        assert response.status_code == 401

    async def test_login_form_suspended_account(self, client: AsyncClient, test_user: User, db_session):
        """Test login form with suspended account fails."""
        from app.models import UserStatus
        from sqlalchemy.ext.asyncio import AsyncSession

        test_user.status = UserStatus.SUSPENDED
        await db_session.flush()

        response = await client.post("/auth/login/form", data={
            "username": test_user.email,
            "password": "password123",
        })

        assert response.status_code == 401


class TestCurrentUser:
    """Tests for GET /auth/me and PATCH /auth/me"""

    async def test_get_current_user(self, client: AsyncClient, test_user: User, auth_headers: dict):
        """Test getting current user info."""
        response = await client.get("/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name

    async def test_get_current_user_no_auth(self, client: AsyncClient):
        """Test getting current user without auth fails."""
        response = await client.get("/auth/me")

        assert response.status_code == 403  # HTTPBearer returns 403 when no token

    async def test_update_current_user(self, client: AsyncClient, auth_headers: dict):
        """Test updating current user profile."""
        response = await client.patch("/auth/me", headers=auth_headers, json={
            "full_name": "Updated Name",
            "department": "Physics",
            "phone": "1234567890",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["department"] == "Physics"
        assert data["phone"] == "1234567890"

    async def test_update_current_user_invalid_year(self, client: AsyncClient, auth_headers: dict):
        """Test updating with invalid year of study fails."""
        response = await client.patch("/auth/me", headers=auth_headers, json={
            "year_of_study": 10,
        })

        assert response.status_code == 422
