#!/bin/bash

echo "================================================"
echo "Stopping QBank Services"
echo "================================================"
echo ""

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pids" ]; then
        echo "✓ Stopping process on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
    fi
}

# Stop local backend and frontend processes
echo "Stopping local processes..."
kill_port 8000  # Backend
kill_port 3000  # Frontend

# Stop Docker containers
echo ""
echo "Stopping Docker containers..."
docker-compose down 2>/dev/null

# Stop standalone MongoDB container (if running)
if docker ps -q -f name=qbank-mongodb >/dev/null 2>&1; then
    echo "✓ Stopping MongoDB container..."
    docker stop qbank-mongodb >/dev/null 2>&1
fi

# Stop standalone Ollama container (if running)
if docker ps -q -f name=qbank-ollama >/dev/null 2>&1; then
    echo "✓ Stopping Ollama container..."
    docker stop qbank-ollama >/dev/null 2>&1
fi

echo ""
echo "================================================"
echo "✅ All QBank services stopped"
echo "================================================"
echo ""
echo "What was stopped:"
echo "  • Backend API (port 8000)"
echo "  • Frontend (port 3000)"
echo "  • Docker containers (MongoDB, Ollama, etc.)"
echo ""
echo "Note: Docker containers are stopped but NOT removed."
echo "To completely remove containers and data, run: ./clean.sh"
echo ""
