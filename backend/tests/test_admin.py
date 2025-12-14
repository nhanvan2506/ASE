"""Tests for admin endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserPenalty, UserRating, Booking, PenaltyStatus
from datetime import date, time, timedelta


@pytest.fixture
async def completed_booking(
    db_session: AsyncSession, test_user: User, test_space
) -> Booking:
    """Create a completed booking for penalty/rating tests."""
    from app.models import BookingStatus, Space

    booking = Booking(
        user_id=test_user.id,
        space_id=test_space.id,
        booking_date=date.today() - timedelta(days=1),
        start_time=time(10, 0),
        end_time=time(12, 0),
        attendees=5,
        purpose="Completed session",
        status=BookingStatus.COMPLETED,
    )
    db_session.add(booking)
    await db_session.flush()
    await db_session.refresh(booking)
    return booking


class TestAdminUsers:
    """Tests for admin user management endpoints."""

    async def test_list_users_as_admin(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test listing users as admin."""
        response = await client.get("/admin/users", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["total"] >= 1

    async def test_list_users_as_regular_user_forbidden(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing users as regular user fails."""
        response = await client.get("/admin/users", headers=auth_headers)

        assert response.status_code == 403

    async def test_list_users_search(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test searching users."""
        response = await client.get(
            "/admin/users",
            headers=admin_headers,
            params={"q": test_user.full_name}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["total"] >= 1

    async def test_get_user_details(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test getting user details as admin."""
        response = await client.get(f"/admin/users/{test_user.id}", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email

    async def test_get_user_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test getting non-existent user."""
        response = await client.get("/admin/users/99999", headers=admin_headers)

        assert response.status_code == 404

    async def test_update_user_status(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test updating user status."""
        response = await client.patch(
            f"/admin/users/{test_user.id}",
            headers=admin_headers,
            json={"status": "suspended"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "suspended"

    async def test_update_user_role(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test updating user role."""
        response = await client.patch(
            f"/admin/users/{test_user.id}",
            headers=admin_headers,
            json={"role": "admin"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"

    async def test_admin_cannot_modify_own_account(
        self, client: AsyncClient, admin_headers: dict, test_admin: User
    ):
        """Test admin cannot modify their own account status or role."""
        response = await client.patch(
            f"/admin/users/{test_admin.id}",
            headers=admin_headers,
            json={"status": "suspended"}
        )

        assert response.status_code == 403

    async def test_get_user_summary(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test getting user summary with history."""
        response = await client.get(
            f"/admin/users/{test_user.id}/summary",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "booking_history" in data
        assert "penalties" in data
        assert "ratings" in data


class TestPenalties:
    """Tests for penalty management endpoints."""

    async def test_list_penalties_as_admin(self, client: AsyncClient, admin_headers: dict):
        """Test listing penalties as admin."""
        response = await client.get("/penalties", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data

    async def test_list_penalties_as_user_forbidden(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing penalties as regular user fails."""
        response = await client.get("/penalties", headers=auth_headers)

        assert response.status_code == 403

    async def test_list_penalties_filter_by_user(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test filtering penalties by user ID."""
        penalty = UserPenalty(
            user_id=test_user.id,
            reason="Test penalty",
            points=5,
            status=PenaltyStatus.ACTIVE,
        )
        db_session.add(penalty)
        await db_session.flush()

        response = await client.get(
            "/penalties",
            headers=admin_headers,
            params={"userId": test_user.id}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        assert all(p["user_id"] == test_user.id for p in data["data"])

    async def test_list_penalties_filter_by_status(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test filtering penalties by status."""
        penalty = UserPenalty(
            user_id=test_user.id,
            reason="Active penalty",
            points=5,
            status=PenaltyStatus.ACTIVE,
        )
        db_session.add(penalty)
        await db_session.flush()

        response = await client.get(
            "/penalties",
            headers=admin_headers,
            params={"status": "active"}
        )

        assert response.status_code == 200
        data = response.json()
        assert all(p["status"] == "active" for p in data["data"])

    async def test_list_penalties_search(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test searching penalties by reason."""
        penalty = UserPenalty(
            user_id=test_user.id,
            reason="Late cancellation penalty",
            points=5,
            status=PenaltyStatus.ACTIVE,
        )
        db_session.add(penalty)
        await db_session.flush()

        response = await client.get(
            "/penalties",
            headers=admin_headers,
            params={"q": "cancellation"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1

    async def test_add_penalty(
        self, client: AsyncClient, admin_headers: dict, test_user: User, completed_booking: Booking
    ):
        """Test adding a penalty to a user."""
        response = await client.post("/penalties", headers=admin_headers, json={
            "user_id": test_user.id,
            "booking_id": completed_booking.id,
            "reason": "No show",
            "points": 10,
        })

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == test_user.id
        assert data["points"] == 10
        assert data["status"] == "active"

    async def test_add_penalty_invalid_points(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test adding penalty with invalid points fails."""
        response = await client.post("/penalties", headers=admin_headers, json={
            "user_id": test_user.id,
            "reason": "Test",
            "points": 100,  # Exceeds max of 50
        })

        assert response.status_code == 422

    async def test_add_penalty_user_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test adding penalty to non-existent user fails."""
        response = await client.post("/penalties", headers=admin_headers, json={
            "user_id": 99999,
            "reason": "Test",
            "points": 10,
        })

        assert response.status_code == 404

    async def test_update_penalty_status(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test updating penalty status."""
        # Create a penalty first
        penalty = UserPenalty(
            user_id=test_user.id,
            reason="Test penalty",
            points=5,
            status=PenaltyStatus.ACTIVE,
        )
        db_session.add(penalty)
        await db_session.flush()
        await db_session.refresh(penalty)

        response = await client.patch(
            f"/penalties/{penalty.id}",
            headers=admin_headers,
            json={"status": "resolved"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"


class TestRatings:
    """Tests for rating management endpoints."""

    async def test_list_ratings_as_admin(self, client: AsyncClient, admin_headers: dict):
        """Test listing ratings as admin."""
        response = await client.get("/ratings", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data

    async def test_list_ratings_as_user_forbidden(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing ratings as regular user fails."""
        response = await client.get("/ratings", headers=auth_headers)

        assert response.status_code == 403

    async def test_list_ratings_filter_by_user(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test filtering ratings by rated user ID."""
        rating = UserRating(
            rated_user_id=test_user.id,
            rating=4,
            comment="Good behavior",
        )
        db_session.add(rating)
        await db_session.flush()

        response = await client.get(
            "/ratings",
            headers=admin_headers,
            params={"ratedUserId": test_user.id}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        assert all(r["rated_user_id"] == test_user.id for r in data["data"])

    async def test_list_ratings_search(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test searching ratings by comment."""
        rating = UserRating(
            rated_user_id=test_user.id,
            rating=5,
            comment="Excellent punctuality",
        )
        db_session.add(rating)
        await db_session.flush()

        response = await client.get(
            "/ratings",
            headers=admin_headers,
            params={"q": "punctuality"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1

    async def test_add_rating(
        self, client: AsyncClient, admin_headers: dict, test_user: User, completed_booking: Booking
    ):
        """Test adding a rating for a user."""
        response = await client.post("/ratings", headers=admin_headers, json={
            "rated_user_id": test_user.id,
            "booking_id": completed_booking.id,
            "rating": 5,
            "comment": "Excellent behavior",
        })

        assert response.status_code == 201
        data = response.json()
        assert data["rated_user_id"] == test_user.id
        assert data["rating"] == 5
        assert data["comment"] == "Excellent behavior"

    async def test_add_rating_invalid_score(
        self, client: AsyncClient, admin_headers: dict, test_user: User
    ):
        """Test adding rating with invalid score fails."""
        response = await client.post("/ratings", headers=admin_headers, json={
            "rated_user_id": test_user.id,
            "rating": 10,  # Invalid, max is 5
        })

        assert response.status_code == 422

    async def test_add_rating_user_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test adding rating for non-existent user fails."""
        response = await client.post("/ratings", headers=admin_headers, json={
            "rated_user_id": 99999,
            "rating": 4,
        })

        assert response.status_code == 404

    async def test_delete_rating(
        self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession
    ):
        """Test deleting a rating."""
        # Create a rating first
        rating = UserRating(
            rated_user_id=test_user.id,
            rating=4,
            comment="Good",
        )
        db_session.add(rating)
        await db_session.flush()
        await db_session.refresh(rating)

        response = await client.delete(f"/ratings/{rating.id}", headers=admin_headers)

        assert response.status_code == 204
