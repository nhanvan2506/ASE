# Study Space Backend

## Setting

### 1. Create virtual environment

**Windows:**

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

**Linux/Mac:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. File `.env`

#### Neon PostgreSQL Cloud

```env
# Neon Database Configuration
# Example connection string from Neon:
# postgresql://USER:PASSWORD@ep-xxxx.aws.neon.tech/neondb?sslmode=require

POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=your_neon_password
POSTGRES_HOST=ep-xxxx.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_SSL_MODE=require
```

## 🗄️ Database Setup

### 1. Migrations

```bash
alembic upgrade head
```

### 2. (Optional) Seed sample dataset

```bash
python -m app.scripts.seed
```

## Run Server

### Development mode (auto-reload)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```
