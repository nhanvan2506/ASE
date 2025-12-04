from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_db
from app.core.exceptions import NotFoundException, ForbiddenException
from app.dependencies import get_current_active_user, get_current_admin_user
from app.models import Space, Utility, SpaceUtility, User, SpaceStatus, Booking, BookingStatus
from app.schemas import (
    SpaceResponse,
    CreateSpaceRequest,
    UpdateSpaceRequest,
    RoomScheduleResponse,
    ScheduleSlotResponse,
)
from app.schemas.common import PaginatedResponse, PaginatedResponseMeta

router = APIRouter()


@router.get("", response_model=PaginatedResponse[SpaceResponse])
async def list_spaces(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, description="Search query"),
    building: str | None = None,
    floor: str | None = None,
    capacity_min: int | None = Query(default=None, alias="capacityMin"),
    capacity_max: int | None = Query(default=None, alias="capacityMax"),
    utilities: str | None = Query(default=None, description="Comma-separated utility keys"),
    status: SpaceStatus | None = None,
):
    """List spaces with filtering & search."""
    query = select(Space).options(selectinload(Space.utilities))

    # Apply filters
    if q:
        query = query.where(
            Space.name.ilike(f"%{q}%") | Space.building.ilike(f"%{q}%")
        )
    if building:
        query = query.where(Space.building == building)
    if floor:
        query = query.where(Space.floor == floor)
    if capacity_min:
        query = query.where(Space.capacity >= capacity_min)
    if capacity_max:
        query = query.where(Space.capacity <= capacity_max)
    if status:
        query = query.where(Space.status == status)

    # Filter by utilities
    if utilities:
        utility_keys = [u.strip() for u in utilities.split(",")]
        for key in utility_keys:
            subquery = (
                select(SpaceUtility.space_id)
                .join(Utility)
                .where(Utility.key == key)
            )
            query = query.where(Space.id.in_(subquery))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    spaces = result.scalars().all()

    return PaginatedResponse(
        data=[SpaceResponse.from_orm_with_utilities(s) for s in spaces],
        meta=PaginatedResponseMeta(total=total, limit=limit, offset=offset)
    )


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(
    space_id: int,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Get a single space."""
    query = select(Space).where(Space.id == space_id).options(selectinload(Space.utilities))
    result = await db.execute(query)
    space = result.scalar_one_or_none()

    if not space:
        raise NotFoundException(detail="Space not found")

    return SpaceResponse.from_orm_with_utilities(space)


@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    request: CreateSpaceRequest,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Create a new space (admin only)."""
    space = Space(
        name=request.name,
        building=request.building,
        floor=request.floor,
        location=request.location,
        capacity=request.capacity,
        image_url=request.image_url,
        status=request.status,
    )

    db.add(space)
    await db.flush()

    # Add utilities
    if request.utilities:
        utility_result = await db.execute(
            select(Utility).where(Utility.key.in_(request.utilities))
        )
        utilities = utility_result.scalars().all()

        for utility in utilities:
            space_utility = SpaceUtility(space_id=space.id, utility_id=utility.id)
            db.add(space_utility)

    await db.flush()

    # Reload with utilities
    query = select(Space).where(Space.id == space.id).options(selectinload(Space.utilities))
    result = await db.execute(query)
    space = result.scalar_one()

    return SpaceResponse.from_orm_with_utilities(space)


@router.patch("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: int,
    request: UpdateSpaceRequest,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Update a space (admin only)."""
    query = select(Space).where(Space.id == space_id).options(selectinload(Space.utilities))
    result = await db.execute(query)
    space = result.scalar_one_or_none()

    if not space:
        raise NotFoundException(detail="Space not found")

    update_data = request.model_dump(exclude_unset=True, exclude={"utilities"})
    for field, value in update_data.items():
        setattr(space, field, value)

    # Update utilities if provided
    if request.utilities is not None:
        # Remove existing
        await db.execute(
            SpaceUtility.__table__.delete().where(SpaceUtility.space_id == space_id)
        )

        # Add new
        utility_result = await db.execute(
            select(Utility).where(Utility.key.in_(request.utilities))
        )
        utilities = utility_result.scalars().all()

        for utility in utilities:
            space_utility = SpaceUtility(space_id=space.id, utility_id=utility.id)
            db.add(space_utility)

    await db.flush()

    # Reload with utilities
    query = select(Space).where(Space.id == space.id).options(selectinload(Space.utilities))
    result = await db.execute(query)
    space = result.scalar_one()

    return SpaceResponse.from_orm_with_utilities(space)


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(
    space_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Delete a space (admin only)."""
    query = select(Space).where(Space.id == space_id)
    result = await db.execute(query)
    space = result.scalar_one_or_none()

    if not space:
        raise NotFoundException(detail="Space not found")

    await db.delete(space)
    await db.flush()


@router.get("/{space_id}/schedule", response_model=RoomScheduleResponse)
async def get_room_schedule(
    space_id: int,
    db: Annotated[AsyncSession, Depends(get_async_db)],
    schedule_date: date = Query(..., alias="date", description="Date to get schedule for (YYYY-MM-DD)")
):
    """Get room schedule for a specific date. Returns 24-hour schedule with occupancy information."""
    # Verify space exists
    space_query = select(Space).where(Space.id == space_id)
    space_result = await db.execute(space_query)
    space = space_result.scalar_one_or_none()

    if not space:
        raise NotFoundException(detail="Space not found")

    # Get all bookings for this space on this date
    bookings_query = select(Booking).where(
        and_(
            Booking.space_id == space_id,
            Booking.booking_date == schedule_date,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.APPROVED])
        )
    ).options(
        selectinload(Booking.user)
    ).order_by(Booking.start_time)
    
    bookings_result = await db.execute(bookings_query)
    bookings = bookings_result.scalars().all()

    # Create 24-hour schedule (0-23)
    # Each slot represents an hour, showing if it's occupied
    schedule_slots = []
    for hour in range(24):
        # Check if this hour slot is occupied by any booking
        occupied_booking = None
        for booking in bookings:
            # Convert times to minutes for easier comparison
            start_minutes = booking.start_time.hour * 60 + booking.start_time.minute
            end_minutes = booking.end_time.hour * 60 + booking.end_time.minute
            hour_start_minutes = hour * 60
            hour_end_minutes = (hour + 1) * 60
            
            # Check if booking overlaps with this hour slot
            # Overlap occurs if: hour_start < booking_end AND hour_end > booking_start
            if hour_start_minutes < end_minutes and hour_end_minutes > start_minutes:
                occupied_booking = booking
                break

        if occupied_booking:
            schedule_slots.append(ScheduleSlotResponse(
                hour=hour,
                is_occupied=True,
                booking_id=occupied_booking.id,
                start_time=occupied_booking.start_time.strftime("%H:%M"),
                end_time=occupied_booking.end_time.strftime("%H:%M"),
                status=occupied_booking.status.value,
                lecturer_name=occupied_booking.user.full_name
            ))
        else:
            schedule_slots.append(ScheduleSlotResponse(
                hour=hour,
                is_occupied=False,
                booking_id=None,
                start_time=None,
                end_time=None,
                status=None,
                lecturer_name=None
            ))

    return RoomScheduleResponse(
        space_id=space.id,
        space_name=space.name,
        date=schedule_date.isoformat(),
        schedule=schedule_slots
    )
