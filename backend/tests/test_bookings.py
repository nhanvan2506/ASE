"""Tests for booking endpoints."""
from datetime import date, time, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Space, Booking, BookingStatus


@pytest.fixture
async def test_booking(db_session: AsyncSession, test_user: User, test_space: Space) -> Booking:
    """Create a test booking."""
    booking = Booking(
        user_id=test_user.id,
        space_id=test_space.id,
        booking_date=date.today() + timedelta(days=1),
        start_time=time(10, 0),
        end_time=time(12, 0),
        attendees=5,
        purpose="Study session",
        status=BookingStatus.PENDING,
    )
    db_session.add(booking)
    await db_session.flush()
    await db_session.refresh(booking)
    return booking


@pytest.fixture
async def approved_booking(db_session: AsyncSession, test_user: User, test_space: Space) -> Booking:
    """Create an approved booking."""
    booking = Booking(
        user_id=test_user.id,
        space_id=test_space.id,
        booking_date=date.today() + timedelta(days=2),
        start_time=time(14, 0),
        end_time=time(16, 0),
        attendees=3,
        purpose="Group meeting",
        status=BookingStatus.APPROVED,
    )
    db_session.add(booking)
    await db_session.flush()
    await db_session.refresh(booking)
    return booking


@pytest.fixture
async def schedule_test_bookings(db_session: AsyncSession, test_user: User, test_space: Space) -> list[Booking]:
    """Create multiple bookings for schedule testing."""
    schedule_date = date.today() + timedelta(days=5)
    bookings = [
        # Morning booking: 8 AM - 10 AM
        Booking(
            user_id=test_user.id,
            space_id=test_space.id,
            booking_date=schedule_date,
            start_time=time(8, 0),
            end_time=time(10, 0),
            attendees=5,
            purpose="Morning lecture",
            status=BookingStatus.APPROVED,
        ),
        # Midday booking: 12 PM - 2 PM
        Booking(
            user_id=test_user.id,
            space_id=test_space.id,
            booking_date=schedule_date,
            start_time=time(12, 0),
            end_time=time(14, 0),
            attendees=3,
            purpose="Lunch meeting",
            status=BookingStatus.APPROVED,
        ),
        # Afternoon booking: 3 PM - 5 PM (PENDING)
        Booking(
            user_id=test_user.id,
            space_id=test_space.id,
            booking_date=schedule_date,
            start_time=time(15, 0),
            end_time=time(17, 0),
            attendees=4,
            purpose="Study group",
            status=BookingStatus.PENDING,
        ),
    ]
    for booking in bookings:
        db_session.add(booking)
    await db_session.flush()
    for booking in bookings:
        await db_session.refresh(booking)
    return bookings


class TestListBookings:
    """Tests for GET /bookings"""

    async def test_list_own_bookings(
        self, client: AsyncClient, auth_headers: dict, test_booking: Booking
    ):
        """Test listing own bookings."""
        response = await client.get("/bookings", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["id"] == test_booking.id

    async def test_list_bookings_no_auth(self, client: AsyncClient):
        """Test listing bookings without auth fails."""
        response = await client.get("/bookings")

        assert response.status_code == 403


class TestCreateBooking:
    """Tests for POST /bookings"""

    async def test_create_booking_success(
        self, client: AsyncClient, auth_headers: dict, test_space: Space
    ):
        """Test creating a booking."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        response = await client.post("/bookings", headers=auth_headers, json={
            "space_id": test_space.id,
            "booking_date": tomorrow,
            "start_time": "09:00",
            "end_time": "11:00",
            "attendees": 5,
            "purpose": "Study group",
        })

        assert response.status_code == 201
        data = response.json()
        assert data["space_id"] == test_space.id
        assert data["status"] == "pending"
        assert data["attendees"] == 5

    async def test_create_booking_space_not_found(self, client: AsyncClient, auth_headers: dict):
        """Test creating booking for non-existent space fails."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        response = await client.post("/bookings", headers=auth_headers, json={
            "space_id": 99999,
            "booking_date": tomorrow,
            "start_time": "09:00",
            "end_time": "11:00",
            "attendees": 5,
            "purpose": "Study",
        })

        assert response.status_code == 404

    async def test_create_booking_exceeds_capacity(
        self, client: AsyncClient, auth_headers: dict, test_space: Space
    ):
        """Test creating booking exceeding capacity fails."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        response = await client.post("/bookings", headers=auth_headers, json={
            "space_id": test_space.id,
            "booking_date": tomorrow,
            "start_time": "09:00",
            "end_time": "11:00",
            "attendees": 100,  # Exceeds capacity
            "purpose": "Large group",
        })

        assert response.status_code == 400

    async def test_create_booking_time_conflict(
        self, client: AsyncClient, auth_headers: dict, test_space: Space, test_booking: Booking
    ):
        """Test creating booking with time conflict fails."""
        response = await client.post("/bookings", headers=auth_headers, json={
            "space_id": test_space.id,
            "booking_date": test_booking.booking_date.isoformat(),
            "start_time": "10:30",  # Overlaps with existing booking
            "end_time": "12:30",
            "attendees": 3,
            "purpose": "Conflicting booking",
        })

        assert response.status_code == 400

    async def test_create_booking_invalid_time(
        self, client: AsyncClient, auth_headers: dict, test_space: Space
    ):
        """Test creating booking with end time before start time fails."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        response = await client.post("/bookings", headers=auth_headers, json={
            "space_id": test_space.id,
            "booking_date": tomorrow,
            "start_time": "14:00",
            "end_time": "12:00",  # Before start time
            "attendees": 5,
            "purpose": "Invalid time",
        })

        assert response.status_code == 400


class TestGetBooking:
    """Tests for GET /bookings/{booking_id}"""

    async def test_get_own_booking(
        self, client: AsyncClient, auth_headers: dict, test_booking: Booking
    ):
        """Test getting own booking details."""
        response = await client.get(f"/bookings/{test_booking.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_booking.id
        assert data["purpose"] == test_booking.purpose

    async def test_get_booking_not_found(self, client: AsyncClient, auth_headers: dict):
        """Test getting non-existent booking."""
        response = await client.get("/bookings/99999", headers=auth_headers)

        assert response.status_code == 404


class TestUpdateBookingStatus:
    """Tests for PATCH /bookings/{booking_id}"""

    async def test_user_cancel_own_booking(
        self, client: AsyncClient, auth_headers: dict, test_booking: Booking
    ):
        """Test user canceling own pending booking."""
        response = await client.patch(
            f"/bookings/{test_booking.id}",
            headers=auth_headers,
            json={"status": "cancelled", "cancellation_reason": "Changed plans"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"
        assert data["cancellation_reason"] == "Changed plans"

    async def test_admin_approve_booking(
        self, client: AsyncClient, admin_headers: dict, test_booking: Booking
    ):
        """Test admin approving a booking."""
        response = await client.patch(
            f"/bookings/{test_booking.id}",
            headers=admin_headers,
            json={"status": "approved"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        assert data["approved_by"] is not None

    async def test_admin_reject_booking(
        self, client: AsyncClient, admin_headers: dict, test_booking: Booking
    ):
        """Test admin rejecting a booking."""
        response = await client.patch(
            f"/bookings/{test_booking.id}",
            headers=admin_headers,
            json={"status": "rejected"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"

    async def test_user_cannot_approve(
        self, client: AsyncClient, auth_headers: dict, test_booking: Booking
    ):
        """Test regular user cannot approve bookings."""
        response = await client.patch(
            f"/bookings/{test_booking.id}",
            headers=auth_headers,
            json={"status": "approved"}
        )

        assert response.status_code == 403


class TestCheckInOut:
    """Tests for check-in/check-out endpoints."""

    async def test_check_in_approved_booking(
        self, client: AsyncClient, auth_headers: dict, approved_booking: Booking
    ):
        """Test checking in to an approved booking."""
        response = await client.post(
            f"/bookings/{approved_booking.id}/check-in",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["check_in_at"] is not None

    async def test_check_in_pending_booking_fails(
        self, client: AsyncClient, auth_headers: dict, test_booking: Booking
    ):
        """Test checking in to a pending booking fails."""
        response = await client.post(
            f"/bookings/{test_booking.id}/check-in",
            headers=auth_headers
        )

        assert response.status_code == 400

    async def test_check_out_after_check_in(
        self, client: AsyncClient, auth_headers: dict, approved_booking: Booking
    ):
        """Test checking out after checking in."""
        # First check in
        await client.post(f"/bookings/{approved_booking.id}/check-in", headers=auth_headers)

        # Then check out
        response = await client.post(
            f"/bookings/{approved_booking.id}/check-out",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["check_out_at"] is not None
        assert data["status"] == "completed"

    async def test_check_out_without_check_in_fails(
        self, client: AsyncClient, auth_headers: dict, approved_booking: Booking
    ):
        """Test checking out without checking in fails."""
        response = await client.post(
            f"/bookings/{approved_booking.id}/check-out",
            headers=auth_headers
        )

        assert response.status_code == 400


class TestDeleteBooking:
    """Tests for DELETE /bookings/{booking_id}"""

    async def test_admin_delete_booking(
        self, client: AsyncClient, admin_headers: dict, test_booking: Booking
    ):
        """Test admin deleting a booking."""
        response = await client.delete(
            f"/bookings/{test_booking.id}",
            headers=admin_headers
        )

        assert response.status_code == 204

    async def test_user_cannot_delete_booking(
        self, client: AsyncClient, auth_headers: dict, test_booking: Booking
    ):
        """Test regular user cannot delete bookings."""
        response = await client.delete(
            f"/bookings/{test_booking.id}",
            headers=auth_headers
        )

        assert response.status_code == 403


class TestGetRoomSchedule:
    """Tests for GET /bookings/schedule/{space_id}"""

    async def test_get_room_schedule_success(
        self, client: AsyncClient, test_space: Space, schedule_test_bookings: list[Booking]
    ):
        """Test getting room schedule successfully."""
        schedule_date = (date.today() + timedelta(days=5)).isoformat()
        response = await client.get(
            f"/bookings/schedule/{test_space.id}",
            params={"date": schedule_date}
        )

        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "space_id" in data
        assert "date" in data
        assert "occupancy" in data
        assert "total_bookings" in data
        
        # Verify space and date
        assert data["space_id"] == test_space.id
        assert data["date"] == schedule_date
        assert data["total_bookings"] == 3
        
        # Verify occupancy array has 24 hours
        assert len(data["occupancy"]) == 24
        
        # Verify occupancy structure for each hour
        for hour_slot in data["occupancy"]:
            assert "hour" in hour_slot
            assert "is_occupied" in hour_slot
            assert "bookings" in hour_slot
            assert 0 <= hour_slot["hour"] <= 23

    async def test_get_room_schedule_occupancy_hours(
        self, client: AsyncClient, test_space: Space, schedule_test_bookings: list[Booking]
    ):
        """Test that occupancy correctly marks booked hours."""
        schedule_date = (date.today() + timedelta(days=5)).isoformat()
        response = await client.get(
            f"/bookings/schedule/{test_space.id}",
            params={"date": schedule_date}
        )

        assert response.status_code == 200
        data = response.json()
        occupancy = data["occupancy"]

        # Hours 8-9 should be occupied (8 AM - 10 AM booking)
        assert occupancy[8]["is_occupied"] is True
        assert len(occupancy[8]["bookings"]) > 0
        assert occupancy[8]["bookings"][0]["purpose"] == "Morning lecture"

        # Hours 12-13 should be occupied (12 PM - 2 PM booking)
        assert occupancy[12]["is_occupied"] is True
        assert occupancy[13]["is_occupied"] is True

        # Hours 15-16 should be occupied (3 PM - 5 PM booking)
        assert occupancy[15]["is_occupied"] is True
        assert occupancy[16]["is_occupied"] is True

        # Random off-peak hour should be unoccupied
        assert occupancy[5]["is_occupied"] is False
        assert len(occupancy[5]["bookings"]) == 0

    async def test_get_room_schedule_space_not_found(self, client: AsyncClient):
        """Test getting schedule for non-existent space fails."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        response = await client.get(
            "/bookings/schedule/99999",
            params={"date": tomorrow}
        )

        assert response.status_code == 404

    async def test_get_room_schedule_empty_day(
        self, client: AsyncClient, test_space: Space
    ):
        """Test getting schedule for day with no bookings."""
        empty_date = (date.today() + timedelta(days=10)).isoformat()
        response = await client.get(
            f"/bookings/schedule/{test_space.id}",
            params={"date": empty_date}
        )

        assert response.status_code == 200
        data = response.json()
        
        assert data["space_id"] == test_space.id
        assert data["total_bookings"] == 0
        assert len(data["occupancy"]) == 24
        
        # All hours should be unoccupied
        for hour_slot in data["occupancy"]:
            assert hour_slot["is_occupied"] is False
            assert len(hour_slot["bookings"]) == 0

    async def test_get_room_schedule_booking_details(
        self, client: AsyncClient, test_space: Space, schedule_test_bookings: list[Booking]
    ):
        """Test that booking details are included in schedule."""
        schedule_date = (date.today() + timedelta(days=5)).isoformat()
        response = await client.get(
            f"/bookings/schedule/{test_space.id}",
            params={"date": schedule_date}
        )

        assert response.status_code == 200
        data = response.json()
        
        # Get a booked hour
        morning_hour = data["occupancy"][8]
        assert morning_hour["is_occupied"] is True
        
        booking = morning_hour["bookings"][0]
        # Verify booking has necessary fields
        assert "id" in booking
        assert "user_id" in booking
        assert "start_time" in booking
        assert "end_time" in booking
        assert "purpose" in booking
        assert "attendees" in booking
        assert "status" in booking

    async def test_get_room_schedule_only_approved_and_pending(
        self, client: AsyncClient, db_session: AsyncSession, test_user: User, test_space: Space
    ):
        """Test that only APPROVED and PENDING bookings appear in schedule."""
        schedule_date = date.today() + timedelta(days=15)
        
        # Create a cancelled booking
        cancelled_booking = Booking(
            user_id=test_user.id,
            space_id=test_space.id,
            booking_date=schedule_date,
            start_time=time(9, 0),
            end_time=time(10, 0),
            attendees=2,
            purpose="Cancelled booking",
            status=BookingStatus.CANCELLED,
        )
        db_session.add(cancelled_booking)
        await db_session.flush()

        response = await client.get(
            f"/bookings/schedule/{test_space.id}",
            params={"date": schedule_date.isoformat()}
        )

        assert response.status_code == 200
        data = response.json()
        
        # Hour 9 should not be occupied since only cancelled booking exists
        assert data["occupancy"][9]["is_occupied"] is False

