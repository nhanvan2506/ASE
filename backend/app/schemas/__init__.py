from app.schemas.common import (
    ApiError,
    PaginatedResponseMeta,
    PaginationParams,
)
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthTokenResponse,
)
from app.schemas.user import (
    UserResponse,
    UserSummaryResponse,
    UpdateUserProfileRequest,
    AdminUpdateUserRequest,
    AdminUserSummaryResponse,
)
from app.schemas.space import (
    SpaceResponse,
    CreateSpaceRequest,
    UpdateSpaceRequest,
    UtilityResponse,
    CreateUtilityRequest,
    UpdateUtilityRequest,
    RoomScheduleResponse,
    ScheduleSlotResponse,
)
from app.schemas.booking import (
    BookingResponse,
    CreateBookingRequest,
    UpdateBookingStatusRequest,
)
from app.schemas.penalty import (
    PenaltyResponse,
    AddPenaltyRequest,
    UpdatePenaltyRequest,
)
from app.schemas.rating import (
    RatingResponse,
    AddRatingRequest,
)

__all__ = [
    # Common
    "ApiError",
    "PaginatedResponseMeta",
    "PaginationParams",
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "AuthTokenResponse",
    # User
    "UserResponse",
    "UserSummaryResponse",
    "UpdateUserProfileRequest",
    "AdminUpdateUserRequest",
    "AdminUserSummaryResponse",
    # Space
    "SpaceResponse",
    "CreateSpaceRequest",
    "UpdateSpaceRequest",
    "UtilityResponse",
    "CreateUtilityRequest",
    "UpdateUtilityRequest",
    "RoomScheduleResponse",
    "ScheduleSlotResponse",
    # Booking
    "BookingResponse",
    "CreateBookingRequest",
    "UpdateBookingStatusRequest",
    # Penalty
    "PenaltyResponse",
    "AddPenaltyRequest",
    "UpdatePenaltyRequest",
    # Rating
    "RatingResponse",
    "AddRatingRequest",
]
