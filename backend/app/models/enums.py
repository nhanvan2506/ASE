import enum


class UserRole(str, enum.Enum):
    """User role types."""
    STUDENT = "student"
    LECTURER = "lecturer"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    """User account status types."""
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SpaceStatus(str, enum.Enum):
    """Space availability status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class BookingStatus(str, enum.Enum):
    """Booking status types."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class PenaltyStatus(str, enum.Enum):
    """Penalty status types."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    EXPIRED = "expired"