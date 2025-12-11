from datetime import datetime, date, time

from pydantic import BaseModel, Field

from app.models.enums import BookingStatus
from app.schemas.space import SpaceResponse
from app.schemas.user import UserSummaryResponse


class BookingResponse(BaseModel):
    """Booking response schema."""
    id: int
    user_id: int
    space_id: int
    booking_date: date
    start_time: time
    end_time: time
    status: BookingStatus
    attendees: int
    purpose: str
    requested_at: datetime
    approved_by: int | None = None
    approved_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    space: SpaceResponse | None = None
    user: UserSummaryResponse | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_relations(cls, booking, include_space: bool = True, include_user: bool = True) -> "BookingResponse":
        """Create response from ORM model with relations."""
        space_response = None
        user_response = None

        if include_space and booking.space:
            space_response = SpaceResponse.from_orm_with_utilities(booking.space)

        if include_user and booking.user:
            # Avoid lazy-loading bookings relationship in async context
            # (prevents MissingGreenlet). If count is needed, ensure it is
            # pre-fetched or add a dedicated field later.
            user_response = UserSummaryResponse(
                id=booking.user.id,
                full_name=booking.user.full_name,
                email=booking.user.email,
                student_id=booking.user.student_id,
                department=booking.user.department,
                profile_image_url=booking.user.profile_image_url,
                status=booking.user.status,
                total_bookings=0,
            )

        return cls(
            id=booking.id,
            user_id=booking.user_id,
            space_id=booking.space_id,
            booking_date=booking.booking_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            status=booking.status,
            attendees=booking.attendees,
            purpose=booking.purpose,
            requested_at=booking.requested_at,
            approved_by=booking.approved_by,
            approved_at=booking.approved_at,
            cancelled_at=booking.cancelled_at,
            cancellation_reason=booking.cancellation_reason,
            check_in_at=booking.check_in_at,
            check_out_at=booking.check_out_at,
            space=space_response,
            user=user_response,
        )


class CreateBookingRequest(BaseModel):
    """Request schema for creating a booking."""
    space_id: int
    booking_date: date
    start_time: time
    end_time: time
    attendees: int = Field(ge=1)
    purpose: str = Field(min_length=1)


class UpdateBookingStatusRequest(BaseModel):
    """Request schema for updating booking status."""
    status: BookingStatus
    cancellation_reason: str | None = None


class HourlyOccupancy(BaseModel):
    """Hourly occupancy slot in schedule."""
    hour: int = Field(ge=0, le=23, description="Hour of the day (0-23)")
    is_occupied: bool = Field(description="Whether the hour slot is occupied")
    bookings: list["BookingResponse"] = Field(default_factory=list, description="Bookings in this hour")

    model_config = {"from_attributes": True}


class RoomScheduleResponse(BaseModel):
    """Room schedule response (ROMS-compatible format)."""
    space_id: int
    date: date
    occupancy: list[HourlyOccupancy] = Field(description="24-hour occupancy information")
    total_bookings: int = Field(description="Total number of bookings for this date")

    model_config = {"from_attributes": True}

