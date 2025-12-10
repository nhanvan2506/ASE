from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import SpaceStatus


class UtilityResponse(BaseModel):
    """Utility response schema."""
    id: int
    key: str
    label: str
    description: str | None = None

    model_config = {"from_attributes": True}


class CreateUtilityRequest(BaseModel):
    """Request schema for creating a utility."""
    key: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str | None = None


class UpdateUtilityRequest(BaseModel):
    """Request schema for updating a utility."""
    label: str | None = None
    description: str | None = None


class SpaceResponse(BaseModel):
    """Space response schema."""
    id: int
    name: str
    building: str
    floor: str
    location: str | None = None
    capacity: int
    image_url: str | None = None
    status: SpaceStatus
    utilities: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_utilities(cls, space) -> "SpaceResponse":
        """Create response from ORM model with utility keys."""
        return cls(
            id=space.id,
            name=space.name,
            building=space.building,
            floor=space.floor,
            location=space.location,
            capacity=space.capacity,
            image_url=space.image_url,
            status=space.status,
            utilities=[u.key for u in space.utilities],
            created_at=space.created_at,
            updated_at=space.updated_at,
        )


class CreateSpaceRequest(BaseModel):
    """Request schema for creating a space."""
    name: str = Field(min_length=1)
    building: str = Field(min_length=1)
    floor: str = Field(min_length=1)
    location: str | None = None
    capacity: int = Field(ge=1)
    image_url: str | None = None
    status: SpaceStatus = SpaceStatus.ACTIVE
    utilities: list[str] = []


class UpdateSpaceRequest(BaseModel):
    """Request schema for updating a space."""
    name: str | None = None
    building: str | None = None
    floor: str | None = None
    location: str | None = None
    capacity: int | None = Field(default=None, ge=1)
    image_url: str | None = None
    status: SpaceStatus | None = None
    utilities: list[str] | None = None


class ScheduleSlotResponse(BaseModel):
    """Schedule slot response schema."""
    hour: int = Field(ge=0, le=23, description="Hour of the day (0-23)")
    is_occupied: bool = Field(description="Whether this hour slot is occupied")
    booking_id: int | None = Field(default=None, description="Booking ID if occupied")
    start_time: str | None = Field(default=None, description="Start time of booking (HH:MM)")
    end_time: str | None = Field(default=None, description="End time of booking (HH:MM)")
    status: str | None = Field(default=None, description="Booking status")
    lecturer_name: str | None = Field(default=None, description="Lecturer name")

    model_config = {"from_attributes": True}


class RoomScheduleResponse(BaseModel):
    """Room schedule response schema for a specific date."""
    space_id: int
    space_name: str
    date: str = Field(description="Date in YYYY-MM-DD format")
    schedule: list[ScheduleSlotResponse] = Field(description="24-hour schedule slots")

    model_config = {"from_attributes": True}


class WeeklySlotAvailability(BaseModel):
    """Availability status for a specific time slot."""
    date: str = Field(description="Date in YYYY-MM-DD format")
    hour: str = Field(description="Hour in HH:00 format")
    is_available: bool = Field(description="Whether the slot is available")
    booking_id: int | None = Field(default=None, description="Booking ID if occupied")


class SpaceWithAvailability(BaseModel):
    """Space response with weekly availability information."""
    id: int
    name: str
    building: str
    floor: str
    location: str | None = None
    capacity: int
    image_url: str | None = None
    status: SpaceStatus
    utilities: list[str] = []
    availability: list[WeeklySlotAvailability] = Field(description="Availability for the requested week")

    model_config = {"from_attributes": True}