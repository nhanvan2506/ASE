"""
Seed script to initialize the database with default data.
Run with: uv run python -m app.scripts.seed
"""
import asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models import User, Utility, Space, UserRole, UserStatus, SpaceStatus


async def seed_utilities(session):
    """Seed default utilities."""
    utilities = [
        {"key": "wifi", "label": "WiFi", "description": "Wireless internet access"},
        {"key": "ac", "label": "Air Conditioning", "description": "Climate control"},
        {"key": "whiteboard", "label": "Whiteboard", "description": "Writing board with markers"},
        {"key": "projector", "label": "Projector", "description": "Video projector for presentations"},
        {"key": "power_outlets", "label": "Power Outlets", "description": "Electrical outlets for charging"},
        {"key": "computer", "label": "Computer", "description": "Desktop computer available"},
        {"key": "printer", "label": "Printer", "description": "Printing services available"},
        {"key": "quiet_zone", "label": "Quiet Zone", "description": "Silent study area"},
    ]

    for util_data in utilities:
        result = await session.execute(
            select(Utility).where(Utility.key == util_data["key"])
        )
        if not result.scalar_one_or_none():
            utility = Utility(**util_data)
            session.add(utility)
            print(f"  Added utility: {util_data['label']}")

    await session.flush()


async def seed_default_users(session):
    """Seed default admin and lecturer users."""
    default_users = [
        {
            "email": "admin@studyspace.com",
            "password": "admin123",
            "full_name": "System Administrator",
            "role": UserRole.ADMIN,
        },
        {
            "email": "test1@gmail.com",
            "password": "12345678",
            "full_name": "Lecturer One",
            "role": UserRole.LECTURER,
        },
    ]

    for user in default_users:
        result = await session.execute(select(User).where(User.email == user["email"]))
        if result.scalar_one_or_none():
            print(f"  User already exists: {user['email']}")
            continue

        new_user = User(
            email=user["email"],
            password_hash=get_password_hash(user["password"]),
            full_name=user["full_name"],
            role=user["role"],
            status=UserStatus.ACTIVE,
        )
        session.add(new_user)
        print(f"  Added user: {user['email']} (password: {user['password']})")

    await session.flush()


async def seed_sample_spaces(session):
    """Seed sample study spaces."""
    from app.models import SpaceUtility

    # Get utilities for linking
    result = await session.execute(select(Utility))
    utilities = {u.key: u for u in result.scalars().all()}

    spaces_data = [
        {
            "name": "Room 401",
            "building": "B4",
            "floor": "4",
            "location": "Near Circle K",
            "capacity": 20,
            "status": SpaceStatus.ACTIVE,
            "utility_keys": ["wifi", "ac", "whiteboard", "power_outlets"],
        },
        {
            "name": "Room 306",
            "building": "B4",
            "floor": "3",
            "location": "Near entrance 1",
            "capacity": 36,
            "status": SpaceStatus.ACTIVE,
            "utility_keys": ["wifi", "ac", "power_outlets"],
        },
        {
            "name": "Room 305",
            "building": "B4",
            "floor": "3",
            "location": "Near Circle K",
            "capacity": 20,
            "status": SpaceStatus.ACTIVE,
            "utility_keys": ["wifi", "ac", "computer", "printer", "power_outlets"],
        },
        {
            "name": "Room 304",
            "building": "B4",
            "floor": "3",
            "location": "Near Circle K",
            "capacity": 40,
            "status": SpaceStatus.ACTIVE,
            "utility_keys": ["wifi", "ac", "quiet_zone", "power_outlets"],
        },
        {
            "name": "Room 503",
            "building": "A4",
            "floor": "5",
            "location": "Near library",
            "capacity": 36,
            "status": SpaceStatus.ACTIVE,
            "utility_keys": ["wifi", "ac", "projector", "whiteboard"],
        },
    ]

    for space_data in spaces_data:
        result = await session.execute(
            select(Space).where(
                Space.name == space_data["name"],
                Space.building == space_data["building"]
            )
        )
        if not result.scalar_one_or_none():
            utility_keys = space_data.pop("utility_keys", [])
            space = Space(**space_data)
            session.add(space)
            await session.flush()

            # Add utilities via junction table
            for key in utility_keys:
                if key in utilities:
                    space_utility = SpaceUtility(
                        space_id=space.id,
                        utility_id=utilities[key].id
                    )
                    session.add(space_utility)

            print(f"  Added space: {space_data['name']}")

    await session.flush()


async def main():
    """Run all seed functions."""
    print("Starting database seed...")

    async with AsyncSessionLocal() as session:
        try:
            print("\nSeeding utilities...")
            await seed_utilities(session)

            print("\nSeeding default users...")
            await seed_default_users(session)

            print("\nSeeding sample spaces...")
            await seed_sample_spaces(session)

            await session.commit()
            print("\nDatabase seeded successfully!")

        except Exception as e:
            await session.rollback()
            print(f"\nError seeding database: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
