from datetime import date, timedelta, time
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
    WeeklyScheduleResponse,
    WeeklySpaceScheduleResponse,
    DailyScheduleResponse,
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
    

def get_iso_week_start_end_dates(year: int, week_number: int) -> tuple[date, date]:
    """
    Calculates the ISO 8601 Monday-to-Sunday date range 
    for a given year and week number.
    """
    try:
        # 1. Get the date of the first Monday of the year
        # Note: ISO 8601 week 1 always contains Jan 4th
        jan_4 = date(year, 1, 4)
        
        # 2. Find the Monday of that first week
        first_monday = jan_4 - timedelta(days=jan_4.weekday())
        
        # 3. Calculate the Monday of the target week
        target_monday = first_monday + timedelta(weeks=week_number - 1)
        
        # 4. Calculate the Sunday of the target week (6 days after Monday)
        target_sunday = target_monday + timedelta(days=6)
        
        return target_monday, target_sunday
        
    except Exception as e:
        # Defensive programming for unexpected edge cases
        raise NotFoundException(detail="Space not found")

@router.get("/items/by_iso_week/")
async def read_items_by_iso_week(
    week_number: Annotated[int, Query(..., ge=1, le=53, description="ISO Week number (1-53)")],
    year: Annotated[int, Query(..., description="Year for the ISO week")]
):
    # Calculate the exact date range from the week/year parameters
    start_date, end_date = get_iso_week_start_end_dates(year, week_number)
    
    # Check if the calculated start date is actually in the requested year.
    # This handles the edge case where Week 1 of Y+1 might start in year Y.
    # We should return the range, even if it spans two years, 
    # but the primary year check is for invalid inputs (e.g., Week 53 of a year that only has 52 weeks).
    
    # In a real application, you would now use 'start_date' and 'end_date' 
    # to query your database:
    # filtered_data = db.query(Item).filter(Item.date >= start_date, Item.date <= end_date).all()
    
    return {
        "message": f"Filtering items for ISO Week {week_number} of {year}", 
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "week": week_number, 
        "year": year
    }


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

    # Create schedule from 05:00 to 23:00 (5-23)
    # Each slot represents an hour, showing if it's occupied
    schedule_slots = []
    for hour in range(5, 24):
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


def _build_weekly_schedule_for_space(
    space: Space,
    bookings_by_date: dict[date, list[Booking]],
    start_date: date,
    end_date: date,
    week_number: int,
    year: int
) -> WeeklySpaceScheduleResponse:
    """Build weekly schedule for a single space."""
    weekly_schedule = []
    current_date = start_date
    
    while current_date <= end_date:
        # Get bookings for this date
        bookings = bookings_by_date.get(current_date, [])
        
        # Create schedule from 05:00 to 23:00 for this day
        schedule_slots = []
        for hour in range(5, 24):
            occupied_booking = None
            for booking in bookings:
                start_minutes = booking.start_time.hour * 60 + booking.start_time.minute
                end_minutes = booking.end_time.hour * 60 + booking.end_time.minute
                hour_start_minutes = hour * 60
                hour_end_minutes = (hour + 1) * 60
                
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
        
        weekly_schedule.append(DailyScheduleResponse(
            date=current_date.isoformat(),
            schedule=schedule_slots
        ))
        
        current_date += timedelta(days=1)
    
    return WeeklySpaceScheduleResponse(
        space_id=space.id,
        space_name=space.name,
        capacity=space.capacity,
        building=space.building,
        floor=space.floor,
        week_number=week_number,
        year=year,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        weekly_schedule=weekly_schedule
    )


@router.get("/schedule/week", response_model=WeeklyScheduleResponse)
async def get_weekly_schedule_all_spaces(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    week_number: Annotated[int, Query(..., ge=1, le=53, description="ISO week number (1-53)")],
    year: Annotated[int, Query(..., description="Year")],
):
    """
    Get 7-day (Monday-Sunday) schedule for ALL spaces.
    
    Query parameters:
    - week_number: ISO week number (1-53)
    - year: Year
    
    Returns: Schedule for all active spaces with all bookings for each day
    """
    try:
        # Calculate Monday and Sunday of the requested week
        start_date, end_date = get_iso_week_start_end_dates(year, week_number)
    except Exception:
        raise NotFoundException(detail="Invalid week number or year")
    
    # Get all active spaces
    spaces_query = select(Space).where(Space.status == SpaceStatus.ACTIVE).order_by(Space.building, Space.floor, Space.name)
    spaces_result = await db.execute(spaces_query)
    spaces = spaces_result.scalars().all()
    
    # Get all bookings for the entire week
    bookings_query = select(Booking).where(
        and_(
            Booking.booking_date >= start_date,
            Booking.booking_date <= end_date,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.APPROVED])
        )
    ).options(selectinload(Booking.user)).order_by(Booking.booking_date, Booking.start_time)
    
    bookings_result = await db.execute(bookings_query)
    bookings = bookings_result.scalars().all()
    
    # Group bookings by (space_id, date)
    bookings_by_space_date: dict[tuple[int, date], list[Booking]] = {}
    for booking in bookings:
        key = (booking.space_id, booking.booking_date)
        if key not in bookings_by_space_date:
            bookings_by_space_date[key] = []
        bookings_by_space_date[key].append(booking)
    
    # Build weekly schedule for each space
    space_schedules = []
    for space in spaces:
        # Get bookings for this space during the week
        bookings_by_date = {}
        current_date = start_date
        while current_date <= end_date:
            key = (space.id, current_date)
            bookings_by_date[current_date] = bookings_by_space_date.get(key, [])
            current_date += timedelta(days=1)
        
        space_schedule = _build_weekly_schedule_for_space(
            space,
            bookings_by_date,
            start_date,
            end_date,
            week_number,
            year
        )
        space_schedules.append(space_schedule)
    
    return WeeklyScheduleResponse(
        week_number=week_number,
        year=year,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        spaces=space_schedules
    )
