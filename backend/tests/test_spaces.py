"""Tests for spaces and utilities endpoints."""
import pytest
from httpx import AsyncClient

from app.models import User, Space, Utility


class TestListSpaces:
    """Tests for GET /spaces"""

    async def test_list_spaces_empty(self, client: AsyncClient):
        """Test listing spaces when none exist."""
        response = await client.get("/spaces")

        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
        assert data["meta"]["total"] == 0

    async def test_list_spaces_with_data(self, client: AsyncClient, test_space: Space):
        """Test listing spaces with existing data."""
        response = await client.get("/spaces")

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["name"] == test_space.name
        assert data["meta"]["total"] == 1

    async def test_list_spaces_pagination(self, client: AsyncClient, test_space: Space):
        """Test spaces pagination."""
        response = await client.get("/spaces", params={"limit": 10, "offset": 0})

        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["limit"] == 10
        assert data["meta"]["offset"] == 0

    async def test_list_spaces_filter_by_building(self, client: AsyncClient, test_space: Space):
        """Test filtering spaces by building."""
        response = await client.get("/spaces", params={"building": test_space.building})

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1

        response = await client.get("/spaces", params={"building": "Nonexistent"})
        data = response.json()
        assert len(data["data"]) == 0

    async def test_list_spaces_filter_by_capacity(self, client: AsyncClient, test_space: Space):
        """Test filtering spaces by capacity."""
        response = await client.get("/spaces", params={"capacityMin": 5})

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1

        response = await client.get("/spaces", params={"capacityMin": 100})
        data = response.json()
        assert len(data["data"]) == 0


class TestGetSpace:
    """Tests for GET /spaces/{space_id}"""

    async def test_get_space_success(self, client: AsyncClient, test_space: Space):
        """Test getting a single space."""
        response = await client.get(f"/spaces/{test_space.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_space.id
        assert data["name"] == test_space.name

    async def test_get_space_not_found(self, client: AsyncClient):
        """Test getting non-existent space."""
        response = await client.get("/spaces/99999")

        assert response.status_code == 404


class TestCreateSpace:
    """Tests for POST /spaces"""

    async def test_create_space_as_admin(self, client: AsyncClient, admin_headers: dict):
        """Test creating a space as admin."""
        response = await client.post("/spaces", headers=admin_headers, json={
            "name": "New Room",
            "building": "New Building",
            "floor": "2",
            "capacity": 20,
            "status": "active",
            "utilities": [],
        })

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Room"
        assert data["building"] == "New Building"
        assert data["capacity"] == 20

    async def test_create_space_as_user_forbidden(self, client: AsyncClient, auth_headers: dict):
        """Test creating a space as regular user fails."""
        response = await client.post("/spaces", headers=auth_headers, json={
            "name": "New Room",
            "building": "New Building",
            "floor": "2",
            "capacity": 20,
            "status": "active",
            "utilities": [],
        })

        assert response.status_code == 403

    async def test_create_space_with_utilities(
        self, client: AsyncClient, admin_headers: dict, test_utilities: list[Utility]
    ):
        """Test creating a space with utilities."""
        # Use the actual utility keys from the fixture
        utility_keys = [u.key for u in test_utilities[:2]]
        response = await client.post("/spaces", headers=admin_headers, json={
            "name": "Room with Utils",
            "building": "Building A",
            "floor": "1",
            "capacity": 10,
            "status": "active",
            "utilities": utility_keys,
        })

        assert response.status_code == 201
        data = response.json()
        for key in utility_keys:
            assert key in data["utilities"]

    async def test_create_space_invalid_capacity(self, client: AsyncClient, admin_headers: dict):
        """Test creating a space with invalid capacity fails."""
        response = await client.post("/spaces", headers=admin_headers, json={
            "name": "Invalid Room",
            "building": "Building",
            "floor": "1",
            "capacity": 0,
            "status": "active",
            "utilities": [],
        })

        assert response.status_code == 422


class TestUpdateSpace:
    """Tests for PATCH /spaces/{space_id}"""

    async def test_update_space_as_admin(
        self, client: AsyncClient, admin_headers: dict, test_space: Space
    ):
        """Test updating a space as admin."""
        response = await client.patch(
            f"/spaces/{test_space.id}",
            headers=admin_headers,
            json={"name": "Updated Name", "capacity": 25}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["capacity"] == 25

    async def test_update_space_as_user_forbidden(
        self, client: AsyncClient, auth_headers: dict, test_space: Space
    ):
        """Test updating a space as regular user fails."""
        response = await client.patch(
            f"/spaces/{test_space.id}",
            headers=auth_headers,
            json={"name": "Updated Name"}
        )

        assert response.status_code == 403


class TestDeleteSpace:
    """Tests for DELETE /spaces/{space_id}"""

    async def test_delete_space_as_admin(
        self, client: AsyncClient, admin_headers: dict, test_space: Space
    ):
        """Test deleting a space as admin."""
        response = await client.delete(f"/spaces/{test_space.id}", headers=admin_headers)

        assert response.status_code == 204

        # Verify deleted
        response = await client.get(f"/spaces/{test_space.id}")
        assert response.status_code == 404

    async def test_delete_space_as_user_forbidden(
        self, client: AsyncClient, auth_headers: dict, test_space: Space
    ):
        """Test deleting a space as regular user fails."""
        response = await client.delete(f"/spaces/{test_space.id}", headers=auth_headers)

        assert response.status_code == 403


class TestGetSpaceSchedule:
    """Tests for GET /spaces/{space_id}/schedule"""

    async def test_get_space_schedule_success(
        self, client: AsyncClient, test_space: Space, test_user: User, db_session
    ):
        """Test getting space schedule for a specific date."""
        from datetime import date, time, timedelta
        from app.models import Booking, BookingStatus

        # Create a booking for tomorrow
        tomorrow = date.today() + timedelta(days=1)
        booking = Booking(
            user_id=test_user.id,
            space_id=test_space.id,
            booking_date=tomorrow,
            start_time=time(10, 0),
            end_time=time(12, 0),
            attendees=5,
            purpose="Test booking",
            status=BookingStatus.APPROVED,
        )
        db_session.add(booking)
        await db_session.flush()

        response = await client.get(
            f"/spaces/{test_space.id}/schedule",
            params={"date": tomorrow.isoformat()}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["space_id"] == test_space.id
        assert data["space_name"] == test_space.name
        assert len(data["schedule"]) == 24

    async def test_get_space_schedule_not_found(self, client: AsyncClient):
        """Test getting schedule for non-existent space fails."""
        from datetime import date, timedelta
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        response = await client.get(
            "/spaces/99999/schedule",
            params={"date": tomorrow}
        )

        assert response.status_code == 404


class TestGetAvailableSpaces:
    """Tests for GET /spaces/available"""

    async def test_get_available_spaces_success(
        self, client: AsyncClient, test_space: Space
    ):
        """Test getting available spaces for a date and time range."""
        from datetime import date, timedelta
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        response = await client.get(
            "/spaces/available",
            params={
                "date": tomorrow,
                "startTime": "09:00",
                "endTime": "11:00",
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data
        assert len(data["data"]) >= 1

    async def test_get_available_spaces_with_conflict(
        self, client: AsyncClient, test_space: Space, db_session
    ):
        """Test getting available spaces when some are booked."""
        from datetime import date, time, timedelta
        from app.models import Booking, BookingStatus, User, UserRole, UserStatus
        from app.core.security import get_password_hash
        import uuid

        # Create a user for the booking
        unique_id = uuid.uuid4().hex[:8]
        user = User(
            email=f"lecturer_{unique_id}@test.com",
            password_hash=get_password_hash("password123"),
            full_name="Test Lecturer",
            role=UserRole.LECTURER,
            status=UserStatus.ACTIVE,
        )
        db_session.add(user)
        await db_session.flush()

        tomorrow = date.today() + timedelta(days=1)
        booking = Booking(
            user_id=user.id,
            space_id=test_space.id,
            booking_date=tomorrow,
            start_time=time(9, 0),
            end_time=time(11, 0),
            attendees=5,
            purpose="Test",
            status=BookingStatus.APPROVED,
        )
        db_session.add(booking)
        await db_session.flush()

        response = await client.get(
            "/spaces/available",
            params={
                "date": tomorrow.isoformat(),
                "startTime": "09:00",
                "endTime": "11:00",
            }
        )

        assert response.status_code == 200
        data = response.json()
        # test_space should not be in available spaces
        space_ids = [s["id"] for s in data["data"]]
        assert test_space.id not in space_ids

    async def test_get_available_spaces_invalid_time_format(
        self, client: AsyncClient
    ):
        """Test getting available spaces with invalid time format fails."""
        from datetime import date, timedelta
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        response = await client.get(
            "/spaces/available",
            params={
                "date": tomorrow,
                "startTime": "9am",
                "endTime": "11am",
            }
        )

        assert response.status_code == 400

    async def test_get_available_spaces_non_rounded_hours(
        self, client: AsyncClient
    ):
        """Test getting available spaces with non-rounded hours fails."""
        from datetime import date, timedelta
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        response = await client.get(
            "/spaces/available",
            params={
                "date": tomorrow,
                "startTime": "09:30",
                "endTime": "11:00",
            }
        )

        assert response.status_code == 400


class TestGetWeeklyAvailability:
    """Tests for GET /spaces/weekly-availability"""

    async def test_get_weekly_availability_success(
        self, client: AsyncClient, test_space: Space
    ):
        """Test getting weekly availability for all spaces."""
        from datetime import date, timedelta

        # Get the Monday of next week
        today = date.today()
        days_until_monday = (7 - today.weekday()) % 7
        next_monday = today + timedelta(days=days_until_monday if days_until_monday != 0 else 7)

        response = await client.get(
            "/spaces/weekly-availability",
            params={"weekStart": next_monday.isoformat()}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Check structure
        space_data = data[0]
        assert "id" in space_data
        assert "name" in space_data
        assert "availability" in space_data

        # Should have 7 days * 19 hours (5am to 11pm) = 133 slots
        assert len(space_data["availability"]) == 7 * 19

    async def test_get_weekly_availability_with_bookings(
        self, client: AsyncClient, test_space: Space, db_session
    ):
        """Test weekly availability reflects existing bookings."""
        from datetime import date, time, timedelta
        from app.models import Booking, BookingStatus, User, UserRole, UserStatus
        from app.core.security import get_password_hash
        import uuid

        # Create a user for the booking
        unique_id = uuid.uuid4().hex[:8]
        user = User(
            email=f"lecturer_{unique_id}@test.com",
            password_hash=get_password_hash("password123"),
            full_name="Test Lecturer",
            role=UserRole.LECTURER,
            status=UserStatus.ACTIVE,
        )
        db_session.add(user)
        await db_session.flush()

        # Get next Monday
        today = date.today()
        days_until_monday = (7 - today.weekday()) % 7
        next_monday = today + timedelta(days=days_until_monday if days_until_monday != 0 else 7)

        # Create booking for next Monday at 10 AM
        booking = Booking(
            user_id=user.id,
            space_id=test_space.id,
            booking_date=next_monday,
            start_time=time(10, 0),
            end_time=time(12, 0),
            attendees=5,
            purpose="Test",
            status=BookingStatus.APPROVED,
        )
        db_session.add(booking)
        await db_session.flush()

        response = await client.get(
            "/spaces/weekly-availability",
            params={"weekStart": next_monday.isoformat()}
        )

        assert response.status_code == 200
        data = response.json()

        # Find our test space
        test_space_data = next((s for s in data if s["id"] == test_space.id), None)
        assert test_space_data is not None

        # Check that Monday at 10:00 is not available
        monday_10am_slot = next(
            (slot for slot in test_space_data["availability"]
             if slot["date"] == next_monday.isoformat() and slot["hour"] == "10:00"),
            None
        )
        assert monday_10am_slot is not None
        assert monday_10am_slot["is_available"] is False


class TestUtilities:
    """Tests for utilities endpoints."""

    async def test_list_utilities(self, client: AsyncClient, test_utilities: list[Utility]):
        """Test listing utilities."""
        response = await client.get("/utilities")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    async def test_create_utility_as_admin(self, client: AsyncClient, admin_headers: dict):
        """Test creating a utility as admin."""
        response = await client.post("/utilities", headers=admin_headers, json={
            "key": "projector",
            "label": "Projector",
            "description": "Video projector",
        })

        assert response.status_code == 201
        data = response.json()
        assert data["key"] == "projector"

    async def test_create_utility_duplicate_key(
        self, client: AsyncClient, admin_headers: dict, test_utilities: list[Utility]
    ):
        """Test creating utility with duplicate key fails."""
        # Use actual key from fixture
        existing_key = test_utilities[0].key
        response = await client.post("/utilities", headers=admin_headers, json={
            "key": existing_key,
            "label": "Duplicate Utility",
        })

        assert response.status_code == 409

    async def test_update_utility_as_admin(
        self, client: AsyncClient, admin_headers: dict, test_utilities: list[Utility]
    ):
        """Test updating a utility as admin."""
        utility = test_utilities[0]
        response = await client.patch(
            f"/utilities/{utility.id}",
            headers=admin_headers,
            json={
                "label": "Updated Label",
                "description": "Updated description"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["label"] == "Updated Label"
        assert data["description"] == "Updated description"

    async def test_update_utility_not_found(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Test updating non-existent utility fails."""
        response = await client.patch(
            "/utilities/99999",
            headers=admin_headers,
            json={"label": "Updated"}
        )

        assert response.status_code == 404

    async def test_delete_utility(
        self, client: AsyncClient, admin_headers: dict, test_utilities: list[Utility]
    ):
        """Test deleting a utility."""
        utility_id = test_utilities[0].id
        response = await client.delete(f"/utilities/{utility_id}", headers=admin_headers)

        assert response.status_code == 204
