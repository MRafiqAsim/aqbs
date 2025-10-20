#!/bin/bash

echo "================================================"
echo "Starting QBank with Ollama (Llama 3)"
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
echo "Checking for processes using ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:11434 | xargs kill -9 2>/dev/null || true

echo ""
echo "Building and starting all services..."
echo "This may take a few minutes on first run..."
echo ""

# Start MongoDB and Ollama first
docker-compose up -d mongodb ollama

echo ""
echo "Waiting for MongoDB and Ollama to start..."
sleep 10

# Pull Llama 3 model into Ollama
echo ""
echo "Pulling Llama 3 model (this may take 5-10 minutes on first run)..."
echo "Model size: ~4.7GB"
echo ""
docker exec qbank-ollama ollama pull llama3

echo ""
echo "✓ Llama 3 model ready!"
echo ""

# Now start backend and frontend
echo "Starting backend and frontend..."
docker-compose up -d --build backend frontend

echo ""
echo "Waiting for services to start..."
sleep 10

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

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is healthy"
else
    echo "⚠ Ollama is starting up..."
fi

echo ""
echo "================================================"
echo "✅ QBank System Started with Ollama!"
echo "================================================"
echo ""
echo "Access your application:"
echo "  🌐 Frontend:    http://localhost:3000"
echo "  🔧 Backend API: http://localhost:8000"
echo "  📚 API Docs:    http://localhost:8000/docs"
echo "  🤖 Ollama:      http://localhost:11434"
echo "  🗄️  MongoDB:     localhost:27017"
echo ""
echo "LLM Model: Llama 3 (via Ollama)"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To view specific service logs:"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f ollama"
echo ""
echo "To stop all services:"
echo "  docker-compose down"
echo ""
echo "================================================"
echo "Open http://localhost:3000 in your browser!"
echo "================================================"
