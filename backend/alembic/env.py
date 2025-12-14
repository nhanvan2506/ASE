from logging.config import fileConfig

from sqlalchemy import create_engine, engine_from_config, pool

from alembic import context

from app.core.config import settings
from app.core.database import Base
from app.models import *  # Import all models for autogenerate

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Don't set sqlalchemy.url in config to avoid interpolation syntax errors with % in URL
# We'll use settings.DATABASE_URL directly in migration functions

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    # Use DATABASE_URL directly to avoid interpolation syntax errors
    url = settings.DATABASE_URL
    # Remove sslmode from URL for offline mode (not needed)
    if "?sslmode=" in url:
        url = url.split("?")[0]
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Prepare connect_args for SSL if needed (psycopg requires connect_args for SSL)
    connect_args = {}
    if settings.POSTGRES_SSL_MODE != "disable":
        # For Supabase, use require mode but disable certificate verification
        # This is needed because Supabase may use self-signed certificates
        if settings.POSTGRES_SSL_MODE in ["require", "prefer"]:
            # Disable certificate verification for development
            # WARNING: This is not secure for production!
            connect_args["sslmode"] = "require"
            connect_args["sslcert"] = None
            connect_args["sslkey"] = None
            connect_args["sslrootcert"] = None
        else:
            connect_args["sslmode"] = settings.POSTGRES_SSL_MODE
    
    # Create engine directly to support SSL for Supabase
    # Remove sslmode from URL if present (we'll use connect_args instead)
    db_url = settings.DATABASE_URL
    if "?sslmode=" in db_url:
        db_url = db_url.split("?")[0]
    
    connectable = create_engine(
        db_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Detect column type changes
            compare_server_default=True,  # Detect default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
