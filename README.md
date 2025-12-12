# Study Space - Full Stack Application

A modern study space booking system built with FastAPI (backend) and Next.js (frontend), containerized with Docker.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Available Commands](#available-commands)
- [CI/CD Pipeline](#cicd-pipeline)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Architecture

```
┌─────────────────┐
│   Nginx (80)    │  Reverse Proxy & Load Balancer
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│Next.js│  │FastAPI│  Application Layer
│ :3000│  │ :8000 │
└───────┘  └───┬───┘
               │
         ┌─────▼─────┐
         │PostgreSQL │  Database Layer
         │   :5432   │
         └───────────┘
```

## Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)
- Make (optional, for convenience commands)

## Quick Start

### First Time Setup

1. **Clone the repository**
   ```bash
   cd /root/assignment/ASE
   ```

2. **Validate Docker setup**
   ```bash
   make validate
   ```

3. **Initialize the application** (creates .env, builds images, starts services, runs migrations)
   ```bash
   make init
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - Direct Backend: http://localhost:8000
   - Direct Frontend: http://localhost:3000

### Manual Setup (without Make)

1. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Build and start services**
   ```bash
   docker compose up -d --build
   ```

3. **Run database migrations**
   ```bash
   docker compose exec backend alembic upgrade head
   ```

## Development

### Start Development Mode (with hot reload)

```bash
make dev
```

This starts all services with:
- Backend hot reload enabled
- Frontend hot reload enabled
- Development-specific configurations

### Stop Development Mode

```bash
make dev-down
```

### Access Container Shells

```bash
# Backend shell
make backend-shell

# Frontend shell
make frontend-shell

# Database shell
make db-shell
```

### Database Operations

```bash
# Run migrations
make migrate

# Create new migration
make migrate-create

# Rollback last migration
make migrate-rollback

# Database backup
make db-backup

# Database restore
make db-restore
```

## Production Deployment

### Using Make

```bash
# Build images
make build

# Start services
make up

# View logs
make logs

# Restart services
make restart

# Stop services
make down

# Clean up (removes volumes)
make clean
```

### Using Docker Compose

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down

# Clean up with volumes
docker compose down -v
```

## Available Commands

Run `make help` to see all available commands:

```
Study Space - Docker Management Commands

Production Commands:
  make build          - Build all Docker images
  make up             - Start all services in production mode
  make down           - Stop all services
  make restart        - Restart all services
  make logs           - View logs from all services
  make clean          - Stop services and remove volumes

Development Commands:
  make dev            - Start services in development mode (with hot reload)
  make dev-down       - Stop development services

Database Commands:
  make migrate        - Run database migrations
  make db-shell       - Open PostgreSQL shell

Shell Access:
  make backend-shell  - Access backend container shell
  make frontend-shell - Access frontend container shell

Testing:
  make test               - Run all tests
  make test-backend       - Run backend tests (in Docker)
  make test-backend-local - Run backend tests (locally)
  make test-frontend      - Run frontend tests
```

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions CI/CD pipeline that:

1. **Backend Tests**
   - Sets up PostgreSQL test database
   - Runs pytest with coverage
   - Validates code quality

2. **Frontend Tests**
   - Runs ESLint
   - Builds production bundle
   - Validates TypeScript types

3. **Integration Tests**
   - Starts all services via Docker Compose
   - Tests service communication
   - Validates health endpoints
   - Tests nginx routing

4. **Docker Image Publishing** (on main branch)
   - Builds optimized Docker images
   - Pushes to GitHub Container Registry
   - Tags with version and latest

### Triggering CI/CD

The pipeline runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## Project Structure

```
.
├── backend/
│   ├── app/              # FastAPI application
│   ├── alembic/          # Database migrations
│   ├── tests/            # Backend tests
│   ├── Dockerfile        # Backend container definition
│   ├── .dockerignore     # Backend Docker ignore rules
│   └── pyproject.toml    # Python dependencies
├── frontend/
│   ├── src/              # Next.js application
│   ├── public/           # Static assets
│   ├── Dockerfile        # Frontend container definition
│   ├── .dockerignore     # Frontend Docker ignore rules
│   └── package.json      # Node dependencies
├── nginx/
│   └── nginx.conf        # Nginx configuration
├── scripts/
│   └── validate-docker.sh # Docker validation script
├── .github/
│   └── workflows/
│       └── ci-cd.yml     # CI/CD pipeline
├── docker-compose.yml    # Production compose file
├── docker-compose.dev.yml # Development compose file
├── Makefile              # Convenience commands
├── .env.example          # Environment template
└── README.md             # This file
```

## Testing

### Backend Tests

```bash
# Run in Docker
make test-backend

# Run locally (requires Python env)
make test-backend-local

# Set up test database
make test-backend-setup
```

### Frontend Tests

```bash
make test-frontend
```

### All Tests

```bash
make test
```

### Health Checks

```bash
make health
```

Expected output:
```
✓ Backend is healthy
✓ Frontend is healthy
✓ Nginx is healthy
```

## Environment Variables

### Database Configuration
- `POSTGRES_USER` - PostgreSQL username (default: postgres)
- `POSTGRES_PASSWORD` - PostgreSQL password (default: postgres)
- `POSTGRES_DB` - Database name (default: study_space)
- `POSTGRES_PORT` - Database port (default: 5432)

### Backend Configuration
- `SECRET_KEY` - JWT secret key (required in production)
- `ALGORITHM` - JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: 11520)

### Frontend Configuration
- `NEXT_PUBLIC_APP_NAME` - Application name (default: Study Space)
- `NEXT_PUBLIC_APP_URL` - Application URL (default: http://localhost)

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
lsof -i :8000  # Replace 8000 with your port

# Stop existing containers
make down
```

### Database Connection Issues

```bash
# Check database status
docker compose ps

# View database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Frontend Build Issues

```bash
# Clear Next.js cache
rm -rf frontend/.next

# Rebuild frontend
docker compose up -d --build frontend
```

### Backend Migration Issues

```bash
# Check migration status
docker compose exec backend alembic current

# View migration history
docker compose exec backend alembic history

# Reset database (WARNING: deletes all data)
make clean
make up
make migrate
```

### View Service Logs

```bash
# All services
make logs

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Reset Everything

```bash
# Complete reset (WARNING: deletes all data)
make clean
make init
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests: `make test`
4. Create a pull request to `develop`
5. CI/CD pipeline will run automatically

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review service logs: `make logs`
- Validate Docker setup: `make validate`
