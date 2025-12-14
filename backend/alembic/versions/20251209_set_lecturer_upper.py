"""Set userrole enum to uppercase values (STUDENT, LECTURER, ADMIN).

Revision ID: 20251209_set_lecturer_upper
Revises: 59d3ae802754
Create Date: 2025-12-09 09:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20251209_set_lecturer_upper"
down_revision: Union[str, Sequence[str], None] = "59d3ae802754"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

old_enum_name = "userrole"
tmp_enum_name = "userrole_upper_tmp"


def upgrade() -> None:
    bind = op.get_bind()

    # Create new enum with uppercase values
    new_enum = sa.Enum("STUDENT", "LECTURER", "ADMIN", name=tmp_enum_name)
    new_enum.create(bind, checkfirst=True)

    # Convert column to text, then to new uppercase enum using upper()
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE TEXT")
    op.execute(
        f"ALTER TABLE users ALTER COLUMN role TYPE {tmp_enum_name} USING upper(role)::{tmp_enum_name}"
    )

    # Swap enums: rename old to *_old, rename tmp to original name, drop old
    op.execute(f'ALTER TYPE "{old_enum_name}" RENAME TO "{old_enum_name}_old"')
    op.execute(f'ALTER TYPE "{tmp_enum_name}" RENAME TO "{old_enum_name}"')
    op.execute(f'DROP TYPE IF EXISTS "{old_enum_name}_old"')


def downgrade() -> None:
    bind = op.get_bind()

    # Recreate lowercase enum (student, lecturer, admin)
    lower_tmp = "userrole_lower_tmp"
    lower_enum = sa.Enum("student", "lecturer", "admin", name=lower_tmp)
    lower_enum.create(bind, checkfirst=True)

    # Convert to lowercase enum
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE TEXT")
    op.execute(
        f"ALTER TABLE users ALTER COLUMN role TYPE {lower_tmp} USING lower(role)::{lower_tmp}"
    )

    # Swap back
    op.execute(f'ALTER TYPE "{old_enum_name}" RENAME TO "{old_enum_name}_upper"')
    op.execute(f'ALTER TYPE "{lower_tmp}" RENAME TO "{old_enum_name}"')
    op.execute(f'DROP TYPE IF EXISTS "{old_enum_name}_upper"')

