#!/bin/bash
# Restart All Services Script

echo "🔄 Restarting QBank System..."
echo ""

# Kill existing processes
echo "Stopping existing services..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "  No process on port 3000"
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "  No process on port 8000"

# Stop Docker containers (keep MongoDB)
docker stop qbank-backend qbank-frontend 2>/dev/null || echo "  Docker containers already stopped"

echo ""
echo "Starting services..."
echo ""

# Start MongoDB if not running
if ! docker ps | grep -q qbank-mongodb; then
    echo "Starting MongoDB..."
    if docker ps -a | grep -q qbank-mongodb; then
        docker start qbank-mongodb
    else
        docker run -d -p 27017:27017 --name qbank-mongodb mongo:7.0
    fi
    sleep 3
else
    echo "MongoDB already running"
fi

# Start Backend
echo "Starting Backend with MLX..."
cd "$(dirname "$0")"
./run-backend-local.sh &
sleep 5

# Start Frontend
echo "Starting Frontend..."
cd frontend && npm run dev &
sleep 3

echo ""
echo "✅ All services started!"
echo ""
echo "Services:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  MongoDB:  localhost:27017"
echo ""
echo "Press Ctrl+C to stop monitoring logs"
echo ""

# Keep script running
wait
