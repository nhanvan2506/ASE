from datetime import datetime, timezone, date, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_db
from app.core.exceptions import (
    NotFoundException,
    ForbiddenException,
    BadRequestException,
)
from app.dependencies import get_current_active_user, get_current_admin_user
from app.models import Booking, Space, User, BookingStatus, UserRole
from app.schemas import (
    BookingResponse,
    CreateBookingRequest,
    UpdateBookingStatusRequest,
)
from app.schemas.booking import HourlyOccupancy, RoomScheduleResponse
from app.schemas.common import PaginatedResponse, PaginatedResponseMeta

router = APIRouter()


@router.get("/schedule/{space_id}", response_model=RoomScheduleResponse)
async def get_room_schedule(
    space_id: int,
    db: Annotated[AsyncSession, Depends(get_async_db)],
    query_date: date = Query(..., alias="date", description="Date in YYYY-MM-DD format")
):
    """Get 24-hour room schedule for a specific date (ROMS-compatible).
    
    Returns an array of 24 hourly slots (0-23) with occupancy information for the specified space and date.
    This endpoint is compatible with the ROMS (Room Management Service) schedule format.
    """
    # Verify space exists
    space_result = await db.execute(
        select(Space).where(Space.id == space_id)
    )
    space = space_result.scalar_one_or_none()

    if not space:
        raise NotFoundException(detail="Space not found")

    # Query all approved and pending bookings for this space and date
    bookings_result = await db.execute(
        select(Booking)
        .where(
            and_(
                Booking.space_id == space_id,
                Booking.booking_date == query_date,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.APPROVED])
            )
        )
        .options(
            selectinload(Booking.space).selectinload(Space.utilities),
            selectinload(Booking.user)
        )
        .order_by(Booking.start_time)
    )
    bookings = bookings_result.scalars().all()

    # Build 24-hour occupancy array
    occupancy = []
    
    for hour in range(24):
        # Create full datetime objects for the slot start and end
        # e.g., 2023-10-31 08:00:00 to 2023-10-31 09:00:00
        slot_start_dt = datetime.combine(query_date, time(hour, 0))
        slot_end_dt = slot_start_dt + timedelta(hours=1)

        bookings_in_hour = []

        for b in bookings:
            # Convert booking times to datetimes on the query date
            b_start_dt = datetime.combine(query_date, b.start_time)
            b_end_dt = datetime.combine(query_date, b.end_time)

            if b.end_time < b.start_time:
                b_end_dt += timedelta(days=1)
            
            if b.end_time == time(0, 0) and b.start_time != time(0, 0):
                 b_end_dt += timedelta(days=1)

            latest_start = max(slot_start_dt, b_start_dt)
            earliest_end = min(slot_end_dt, b_end_dt)

            if latest_start < earliest_end:
                bookings_in_hour.append(b)

        hourly_slot = HourlyOccupancy(
            hour=hour,
            is_occupied=len(bookings_in_hour) > 0,
            bookings=[
                BookingResponse.from_orm_with_relations(b)
                for b in bookings_in_hour
            ]
        )
        occupancy.append(hourly_slot)

    return RoomScheduleResponse(
        space_id=space_id,
        date=query_date,
        occupancy=occupancy,
        total_bookings=len(bookings)
    )


@router.get("", response_model=PaginatedResponse[BookingResponse])
async def list_bookings(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: BookingStatus | None = None,
    my: bool = Query(default=True, description="If true, only return user's own bookings"),
    user_id: int | None = Query(default=None, description="Admin filter by userId"),
    space_id: int | None = Query(default=None, alias="spaceId"),
):
    """List bookings."""
    query = select(Booking).options(
        selectinload(Booking.space).selectinload(Space.utilities),
        selectinload(Booking.user)
    )

    # Non-admin users can ONLY see their own bookings (ignore my and user_id parameters)
    if current_user.role != UserRole.ADMIN:
        query = query.where(Booking.user_id == current_user.id)
    else:
        # Admin can filter by user_id or see their own bookings
        if user_id:
            query = query.where(Booking.user_id == user_id)
        elif my:
            query = query.where(Booking.user_id == current_user.id)
        # If admin sets my=False and no user_id, show all bookings

    if status:
        query = query.where(Booking.status == status)
    if space_id:
        query = query.where(Booking.space_id == space_id)

    # Order by most recent first
    query = query.order_by(Booking.booking_date.desc(), Booking.start_time.desc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    bookings = result.scalars().all()

    return PaginatedResponse(
        data=[BookingResponse.from_orm_with_relations(b) for b in bookings],
        meta=PaginatedResponseMeta(total=total, limit=limit, offset=offset)
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Get booking details."""
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.space).selectinload(Space.utilities),
        selectinload(Booking.user)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundException(detail="Booking not found")

    # Non-admin can only view their own bookings
    if current_user.role != UserRole.ADMIN and booking.user_id != current_user.id:
        raise ForbiddenException(detail="Not allowed to view this booking")

    return BookingResponse.from_orm_with_relations(booking)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: CreateBookingRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Create a new booking request."""
    # Verify space exists and is active
    space_result = await db.execute(
        select(Space).where(Space.id == request.space_id).options(selectinload(Space.utilities))
    )
    space = space_result.scalar_one_or_none()

    if not space:
        raise NotFoundException(detail="Space not found")

    if space.status != "active":
        raise BadRequestException(detail="Space is not available for booking")

    # Check capacity
    if request.attendees > space.capacity:
        raise BadRequestException(
            detail=f"Attendees ({request.attendees}) exceeds space capacity ({space.capacity})"
        )

    # Check time validity
    if request.end_time <= request.start_time:
        raise BadRequestException(detail="End time must be after start time")

    # Check for time conflicts
    conflict_query = select(Booking).where(
        and_(
            Booking.space_id == request.space_id,
            Booking.booking_date == request.booking_date,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.APPROVED]),
            Booking.start_time < request.end_time,
            Booking.end_time > request.start_time,
        )
    )
    conflict_result = await db.execute(conflict_query)
    if conflict_result.scalar_one_or_none():
        raise BadRequestException(detail="Time slot conflicts with existing booking")

    booking = Booking(
        user_id=current_user.id,
        space_id=request.space_id,
        booking_date=request.booking_date,
        start_time=request.start_time,
        end_time=request.end_time,
        attendees=request.attendees,
        purpose=request.purpose,
        status=BookingStatus.PENDING,
    )

    db.add(booking)
    await db.flush()

    # Reload with relations
    query = select(Booking).where(Booking.id == booking.id).options(
        selectinload(Booking.space).selectinload(Space.utilities),
        selectinload(Booking.user)
    )
    result = await db.execute(query)
    booking = result.scalar_one()

    return BookingResponse.from_orm_with_relations(booking)


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    request: UpdateBookingStatusRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Update booking status (approve/reject/cancel/etc.)."""
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.space).selectinload(Space.utilities),
        selectinload(Booking.user)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundException(detail="Booking not found")

    is_admin = current_user.role == UserRole.ADMIN
    is_owner = booking.user_id == current_user.id

    # Users can only cancel their own pending bookings
    if not is_admin:
        if not is_owner:
            raise ForbiddenException(detail="Not allowed to modify this booking")
        if request.status != BookingStatus.CANCELLED:
            raise ForbiddenException(detail="Users can only cancel their bookings")
        if booking.status != BookingStatus.PENDING:
            raise BadRequestException(detail="Can only cancel pending bookings")

    # Update status
    booking.status = request.status

    if request.status == BookingStatus.CANCELLED:
        booking.cancelled_at = datetime.now(timezone.utc)
        booking.cancellation_reason = request.cancellation_reason

    if request.status in [BookingStatus.APPROVED, BookingStatus.REJECTED]:
        booking.approved_by = current_user.id
        booking.approved_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(booking)

    return BookingResponse.from_orm_with_relations(booking)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Hard-delete a booking (admin only)."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundException(detail="Booking not found")

    await db.delete(booking)
    await db.flush()


@router.post("/{booking_id}/check-in", response_model=BookingResponse)
async def check_in_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Mark a booking as checked-in."""
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.space).selectinload(Space.utilities),
        selectinload(Booking.user)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundException(detail="Booking not found")

    is_admin = current_user.role == UserRole.ADMIN
    is_owner = booking.user_id == current_user.id

    if not is_admin and not is_owner:
        raise ForbiddenException(detail="Not allowed to check in this booking")

    if booking.status != BookingStatus.APPROVED:
        raise BadRequestException(detail="Can only check in approved bookings")

    if booking.check_in_at:
        raise BadRequestException(detail="Already checked in")

    booking.check_in_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(booking)

    return BookingResponse.from_orm_with_relations(booking)


@router.post("/{booking_id}/check-out", response_model=BookingResponse)
async def check_out_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Mark a booking as checked-out."""
    query = select(Booking).where(Booking.id == booking_id).options(
        selectinload(Booking.space).selectinload(Space.utilities),
        selectinload(Booking.user)
    )
    result = await db.execute(query)
    booking = result.scalar_one_or_none()

    if not booking:
        raise NotFoundException(detail="Booking not found")

    is_admin = current_user.role == UserRole.ADMIN
    is_owner = booking.user_id == current_user.id

    if not is_admin and not is_owner:
        raise ForbiddenException(detail="Not allowed to check out this booking")

    if not booking.check_in_at:
        raise BadRequestException(detail="Must check in before checking out")

    if booking.check_out_at:
        raise BadRequestException(detail="Already checked out")

    booking.check_out_at = datetime.now(timezone.utc)
    booking.status = BookingStatus.COMPLETED

    await db.flush()
    await db.refresh(booking)

    return BookingResponse.from_orm_with_relations(booking)
