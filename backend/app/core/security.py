from datetime import datetime, timedelta, timezone
from typing import Any
import base64
import html
import re

import bcrypt
import jwt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def create_access_token(subject: int | str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


# Encryption/Decryption for Booking Purpose
_fernet_instance: Fernet | None = None


def _derive_key_from_secret() -> bytes:
    """Derive a stable Fernet key from SECRET_KEY for deterministic usage."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'booking_encryption_salt',  # Fixed salt for consistency
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))


def _get_fernet() -> Fernet:
    """Get or create Fernet instance for encryption."""
    global _fernet_instance
    if _fernet_instance is None:
        # If ENCRYPTION_KEY is provided, prefer it; fall back to derived key if invalid
        if settings.ENCRYPTION_KEY:
            try:
                _fernet_instance = Fernet(settings.ENCRYPTION_KEY.encode())
            except Exception:
                import logging
                logging.warning("Invalid ENCRYPTION_KEY provided; falling back to derived key")
                _fernet_instance = Fernet(_derive_key_from_secret())
        else:
            # Use deterministic key derived from SECRET_KEY (stable across restarts)
            _fernet_instance = Fernet(_derive_key_from_secret())
    return _fernet_instance


def encrypt_booking_data(plain_text: str) -> str:
    """Encrypt booking sensitive text data (purpose, cancellation_reason, etc.)."""
    if not plain_text:
        return plain_text
    try:
        fernet = _get_fernet()
        encrypted = fernet.encrypt(plain_text.encode('utf-8'))
        return encrypted.decode('utf-8')
    except Exception as e:
        # If encryption fails, log error but don't crash
        # In production, you might want to raise an exception
        import logging
        logging.error(f"Failed to encrypt booking data: {e}")
        return plain_text  # Fallback to plain text (not recommended in production)


def decrypt_booking_data(encrypted_text: str) -> str:
    """Decrypt booking sensitive text data."""
    if not encrypted_text:
        return encrypted_text
    try:
        fernet = _get_fernet()
        decrypted = fernet.decrypt(encrypted_text.encode('utf-8'))
        return decrypted.decode('utf-8')
    except Exception as e:
        # If decryption fails, it might be plain text (for backward compatibility)
        # Try to return as-is if it looks like plain text
        import logging
        logging.warning(f"Failed to decrypt booking data (might be plain text): {e}")
        # Check if it looks like encrypted data (base64 format)
        if encrypted_text.startswith('gAAAAAB') or len(encrypted_text) > 100:
            # Looks like encrypted data but decryption failed
            raise ValueError("Cannot decrypt booking data - invalid encryption key or corrupted data")
        # Otherwise, assume it's plain text (for backward compatibility with existing data)
        return encrypted_text


# Backward compatibility aliases
encrypt_booking_purpose = encrypt_booking_data
decrypt_booking_purpose = decrypt_booking_data


# ============================================================================
# Input Sanitization (Security Technique #2)
# ============================================================================

def sanitize_input(text: str, max_length: int = 1000, allow_html: bool = False) -> str:
    """
    Sanitize user input to prevent XSS, injection attacks, and other security issues.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        allow_html: If False, escape HTML entities. If True, strip HTML tags.
    
    Returns:
        Sanitized text
    """
    if not text:
        return text
    
    # Remove null bytes and control characters (except newlines and tabs)
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F]', '', text)
    
    # Limit length
    if len(text) > max_length:
        text = text[:max_length]
    
    if not allow_html:
        # Escape HTML entities to prevent XSS
        text = html.escape(text, quote=True)
    else:
        # Remove potentially dangerous HTML tags and attributes
        # Allow only safe tags if needed (implement whitelist approach)
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',  # Remove script tags
            r'<iframe[^>]*>.*?</iframe>',  # Remove iframe tags
            r'on\w+\s*=',  # Remove event handlers (onclick, onerror, etc.)
            r'javascript:',  # Remove javascript: protocol
            r'data:text/html',  # Remove data URIs with HTML
        ]
        for pattern in dangerous_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove SQL injection patterns (basic protection, ORM should handle most)
    sql_patterns = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)',
        r'(\b(UNION|OR|AND)\s+\d+\s*=\s*\d+)',
        r'(\'|\"|;|--|\*|/\*|\*/)',
    ]
    # Note: We don't remove these completely as they might be legitimate,
    # but we can log suspicious patterns
    
    # Normalize whitespace (prevent excessive whitespace attacks)
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def sanitize_booking_purpose(purpose: str) -> str:
    """Sanitize booking purpose field."""
    return sanitize_input(purpose, max_length=500, allow_html=False)


def sanitize_cancellation_reason(reason: str) -> str:
    """Sanitize cancellation reason field."""
    return sanitize_input(reason, max_length=500, allow_html=False)
