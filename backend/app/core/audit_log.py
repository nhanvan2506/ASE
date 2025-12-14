"""Audit logging for booking operations and security events."""
from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from sqlalchemy import BigInteger, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import Base
from app.core.config import settings


class AuditAction(str, Enum):
    """Types of audit actions."""
    BOOKING_CREATED = "booking_created"
    BOOKING_UPDATED = "booking_updated"
    BOOKING_DELETED = "booking_deleted"
    BOOKING_APPROVED = "booking_approved"
    BOOKING_REJECTED = "booking_rejected"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_VIEWED = "booking_viewed"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"


class AuditLog(Base):
    """Audit log table for tracking security events and booking operations."""
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Action details
    action: Mapped[AuditAction] = mapped_column(SQLEnum(AuditAction), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # e.g., "booking", "user"
    resource_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)  # e.g., booking_id
    
    # Request details
    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Additional context
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string for additional info
    status: Mapped[str] = mapped_column(Text, nullable=False, default="success")  # success, failed, error
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


async def log_audit_event(
    db: AsyncSession,
    action: AuditAction,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[str] = None,
    status: str = "success"
):
    """Log an audit event. Returns immediately if audit logging is disabled."""
    if not settings.ENABLE_AUDIT_LOGS:
        return
    audit_log = AuditLog(
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        status=status
    )
    db.add(audit_log)
    await db.flush()


