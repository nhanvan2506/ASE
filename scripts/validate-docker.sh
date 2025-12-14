#!/bin/bash
set -e

echo "============================================"
echo "Docker Setup Validation Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed: $(docker --version)"
else
    echo -e "${RED}✗${NC} Docker is not installed"
    exit 1
fi

# Check if Docker Compose is installed
echo ""
echo "2. Checking Docker Compose installation..."
if command -v docker compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose is installed: $(docker compose version)"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    exit 1
fi

# Check if .env file exists
echo ""
echo "3. Checking .env file..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${YELLOW}⚠${NC} .env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env file from .env.example"
        echo -e "${YELLOW}⚠${NC} Please update .env with your configuration"
    else
        echo -e "${RED}✗${NC} .env.example not found"
        exit 1
    fi
fi

# Check required files
echo ""
echo "4. Checking required Docker files..."
files=(
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "backend/Dockerfile"
    "backend/.dockerignore"
    "frontend/Dockerfile"
    "frontend/.dockerignore"
    "nginx/nginx.conf"
)

for file in "\${files[@]}"; do
    if [ -f "\$file" ]; then
        echo -e "${GREEN}✓${NC} \$file"
    else
        echo -e "${RED}✗${NC} \$file not found"
        exit 1
    fi
done

# Validate docker-compose.yml
echo ""
echo "5. Validating docker-compose.yml..."
if docker compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.yml has errors"
    docker compose config
    exit 1
fi

# Check if ports are available
echo ""
echo "6. Checking if required ports are available..."
ports=(80 3000 5432 8000)
for port in "\${ports[@]}"; do
    if lsof -Pi :\$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} Port \$port is already in use"
    else
        echo -e "${GREEN}✓${NC} Port \$port is available"
    fi
done

# Check Docker daemon
echo ""
echo "7. Checking Docker daemon..."
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
else
    echo -e "${RED}✗${NC} Docker daemon is not running"
    exit 1
fi

# Check disk space
echo ""
echo "8. Checking available disk space..."
available_space=\$(df -h . | awk 'NR==2 {print \$4}')
echo -e "${GREEN}✓${NC} Available disk space: \$available_space"

echo ""
echo "============================================"
echo -e "${GREEN}All checks passed!${NC}"
echo "============================================"
echo ""
echo "You can now start the application with:"
echo "  make init           - First time setup"
echo "  make up             - Start production mode"
echo "  make dev            - Start development mode"
echo ""
