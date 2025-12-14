.PHONY: help build up down restart logs clean test test-backend-setup test-backend test-backend-local test-frontend migrate db-shell backend-shell frontend-shell dev dev-down

# Default target
help:
	@echo "Study Space - Docker Management Commands"
	@echo ""
	@echo "Production Commands:"
	@echo "  make build          - Build all Docker images"
	@echo "  make up             - Start all services in production mode"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs from all services"
	@echo "  make clean          - Stop services and remove volumes"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev            - Start services in development mode (with hot reload)"
	@echo "  make dev-down       - Stop development services"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate        - Run database migrations"
	@echo "  make db-shell       - Open PostgreSQL shell"
	@echo ""
	@echo "Shell Access:"
	@echo "  make backend-shell  - Access backend container shell"
	@echo "  make frontend-shell - Access frontend container shell"
	@echo ""
	@echo "Testing:"
	@echo "  make test               - Run all tests"
	@echo "  make test-backend-setup - Set up test database"
	@echo "  make test-backend       - Run backend tests (in Docker)"
	@echo "  make test-backend-local - Run backend tests (locally)"
	@echo "  make test-frontend      - Run frontend tests"

# Production Commands
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

clean:
	docker compose down -v
	@echo "Removed all containers and volumes"

# Development Commands
dev:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

# Database Commands
migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@read -p "Enter migration message: " msg; \
	docker compose exec backend alembic revision --autogenerate -m "$$msg"

migrate-rollback:
	docker compose exec backend alembic downgrade -1

db-shell:
	docker compose exec db psql -U postgres -d study_space

db-backup:
	docker compose exec db pg_dump -U postgres study_space > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Database backup created"

db-restore:
	@read -p "Enter backup file path: " file; \
	cat $$file | docker compose exec -T db psql -U postgres study_space

# Shell Access
backend-shell:
	docker compose exec backend bash

frontend-shell:
	docker compose exec frontend sh

# Testing
test: test-backend test-frontend

test-backend-setup:
	@echo "Setting up test database..."
	docker compose exec backend python scripts/setup_test_db.py

test-backend:
	@echo "Running backend tests..."
	docker compose exec backend pytest tests/ -v

test-backend-local:
	@echo "Running backend tests locally (requires local Python environment)..."
	cd backend && pytest tests/ -v

test-frontend:
	cd frontend && npm run lint && npm run build

# Health Checks
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8000/health && echo "✓ Backend is healthy" || echo "✗ Backend is unhealthy"
	@curl -f http://localhost:3000 && echo "✓ Frontend is healthy" || echo "✗ Frontend is unhealthy"
	@curl -f http://localhost/health && echo "✓ Nginx is healthy" || echo "✗ Nginx is unhealthy"

# Status
status:
	docker compose ps

# Environment Setup
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please update .env with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi

# Validate Docker setup
validate:
	@chmod +x scripts/validate-docker.sh
	@./scripts/validate-docker.sh

# Full Setup (for first time)
init: setup build up migrate
	@echo ""
	@echo "Setup complete!"
	@echo "Application is running at:"
	@echo "  - Frontend: http://localhost"
	@echo "  - Backend API: http://localhost/api"
	@echo "  - Direct Backend: http://localhost:8000"
	@echo "  - Direct Frontend: http://localhost:3000"
