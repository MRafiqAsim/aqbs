#!/bin/bash

echo "================================================"
echo "Starting QBank - Complete System"
echo "================================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Stop any existing containers
echo "Stopping any existing containers..."
docker-compose down

# Kill any local processes using our ports
echo "Checking for processes using ports 3000, 8000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo ""
echo "Building and starting all services..."
echo "This may take a few minutes on first run..."
echo ""

# Build and start all services
docker-compose up --build -d

echo ""
echo "Waiting for services to start..."
sleep 15

# Check service status
echo ""
echo "Service Status:"
echo "================================================"
docker-compose ps

echo ""
echo "Checking service health..."
sleep 5

# Try to reach the backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Backend is healthy"
else
    echo "⚠ Backend is starting up..."
fi

# Try to reach the frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Frontend is healthy"
else
    echo "⚠ Frontend is starting up..."
fi

echo ""
echo "================================================"
echo "✅ QBank System Started!"
echo "================================================"
echo ""
echo "Access your application:"
echo "  🌐 Frontend:    http://localhost:3000"
echo "  🔧 Backend API: http://localhost:8000"
echo "  📚 API Docs:    http://localhost:8000/docs"
echo "  🗄️  MongoDB:     localhost:27017"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To view specific service logs:"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f mongodb"
echo ""
echo "To stop all services:"
echo "  docker-compose down"
echo ""
echo "================================================"
echo "Open http://localhost:3000 in your browser!"
echo "================================================"
