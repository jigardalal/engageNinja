#!/bin/bash

# EngageNinja - Development Environment Setup Script
# This script sets up the complete development environment for EngageNinja
# and starts both frontend and backend servers

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EngageNinja - Development Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Please install Node.js (v18+)${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed. Please install npm${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm globally...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✓ pnpm found: $(pnpm --version)${NC}"

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}Creating backend/.env from .env.example...${NC}"
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
    else
        echo -e "${YELLOW}Note: backend/.env.example not found. Create backend/.env manually with required variables.${NC}"
    fi
fi

# Install backend dependencies
echo -e "${BLUE}Installing backend dependencies...${NC}"
cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Initialize database
echo -e "${BLUE}Initializing database...${NC}"
npm run db:init || echo -e "${YELLOW}Database initialization skipped (schema/seed not yet implemented)${NC}"
echo -e "${GREEN}✓ Database ready${NC}"

cd ..

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

# Read ports from environment or use defaults
FRONTEND_PORT=${FRONTEND_PORT:-3173}
BACKEND_PORT=${BACKEND_PORT:-5173}

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}To start development servers:${NC}"
echo -e "${GREEN}npm run dev${NC}"
echo ""
echo -e "${BLUE}Frontend will be available at:${NC}"
echo -e "${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo ""
echo -e "${BLUE}Backend API will be available at:${NC}"
echo -e "${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo ""
echo -e "${BLUE}Test Credentials:${NC}"
echo -e "${GREEN}Admin: admin@engageninja.local / AdminPassword123${NC}"
echo -e "${GREEN}User: user@engageninja.local / UserPassword123${NC}"
echo ""
echo -e "${BLUE}Environment Variables:${NC}"
echo -e "${GREEN}FRONTEND_PORT=${FRONTEND_PORT}${NC}"
echo -e "${GREEN}BACKEND_PORT=${BACKEND_PORT}${NC}"
echo ""
echo -e "${BLUE}For more information, see README.md${NC}"
