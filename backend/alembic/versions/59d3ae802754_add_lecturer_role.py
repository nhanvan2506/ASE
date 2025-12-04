"""add_lecturer_role

Revision ID: 59d3ae802754
Revises: c09b20211832
Create Date: 2025-12-03 03:49:04.650570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59d3ae802754'
down_revision: Union[str, Sequence[str], None] = 'c09b20211832'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add LECTURER role to userrole enum."""
    # Add LECTURER value to existing userrole enum
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'lecturer'")


def downgrade() -> None:
    """Remove LECTURER role from userrole enum."""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum, which is complex
    # For now, we'll leave it as a no-op
    # In production, you might need to:
    # 1. Create new enum without LECTURER
    # 2. Update all columns
    # 3. Drop old enum
    # 4. Rename new enum
    pass
