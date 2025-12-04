from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.dependencies.auth import bearer_scheme
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
)
from app.dependencies.auth import get_current_active_user
from app.models import User, UserRole, UserStatus
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    AuthTokenResponse,
    UserResponse,
    UpdateUserProfileRequest,
)

router = APIRouter()


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Register a new user (student by default)."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    if result.scalar_one_or_none():
        raise ConflictException(detail="Email already registered", code="EMAIL_EXISTS")

    # Check if student_id already exists (if provided)
    if request.student_id:
        result = await db.execute(select(User).where(User.student_id == request.student_id))
        if result.scalar_one_or_none():
            raise ConflictException(detail="Student ID already registered", code="STUDENT_ID_EXISTS")

    # Create new user
    user = User(
        email=request.email.lower(),
        password_hash=get_password_hash(request.password),
        full_name=request.full_name,
        student_id=request.student_id,
        department=request.department,
        year_of_study=request.year_of_study,
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )

    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Create access token
    token = create_access_token(subject=user.id)

    return AuthTokenResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=AuthTokenResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Log in and receive JWT token."""
    from app.core.audit_log import log_audit_event, AuditAction
    
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    user = result.scalar_one_or_none()

    ip_address = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")

    if not user or not verify_password(request.password, user.password_hash):
        # Log failed login attempt
        await log_audit_event(
            db=db,
            action=AuditAction.LOGIN_FAILED,
            user_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            details=f"Failed login attempt for email: {request.email}",
            status="failed"
        )
        raise UnauthorizedException(detail="Invalid email or password", code="INVALID_CREDENTIALS")

    if user.status != UserStatus.ACTIVE:
        # Log failed login (suspended account)
        await log_audit_event(
            db=db,
            action=AuditAction.LOGIN_FAILED,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            details="Login attempt on suspended account",
            status="failed"
        )
        raise UnauthorizedException(detail="Account is suspended", code="ACCOUNT_SUSPENDED")

    # Create access token
    token = create_access_token(subject=user.id)

    # Log successful login
    await log_audit_event(
        db=db,
        action=AuditAction.LOGIN_SUCCESS,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        status="success"
    )

    return AuthTokenResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login/form", response_model=AuthTokenResponse)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Log in using form data (for OAuth2 compatibility)."""
    result = await db.execute(select(User).where(User.email == form_data.username.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise UnauthorizedException(detail="Invalid email or password", code="INVALID_CREDENTIALS")

    if user.status != UserStatus.ACTIVE:
        raise UnauthorizedException(detail="Account is suspended", code="ACCOUNT_SUSPENDED")

    token = create_access_token(subject=user.id)

    return AuthTokenResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """Get current authenticated user."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    request: UpdateUserProfileRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """Update current user profile."""
    update_data = request.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.flush()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)
