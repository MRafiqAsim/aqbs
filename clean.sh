#!/bin/bash

echo "================================================"
echo "QBank Docker Cleanup Script"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will remove:"
echo "  • All QBank Docker containers"
echo "  • All QBank Docker volumes (MongoDB data, Ollama models)"
echo "  • All QBank Docker images"
echo "  • Standalone qbank-mongodb container"
echo ""
echo "This will NOT remove:"
echo "  • Local files (uploads, extracted_text, generated_questions)"
echo "  • Python virtual environment"
echo "  • MLX models in ./models directory"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Stop all services first
echo "1. Stopping all services..."
docker-compose down 2>/dev/null
docker stop qbank-mongodb 2>/dev/null
docker stop qbank-ollama 2>/dev/null

# Remove containers
echo ""
echo "2. Removing containers..."
docker-compose rm -f 2>/dev/null
docker rm -f qbank-mongodb 2>/dev/null
docker rm -f qbank-ollama 2>/dev/null
docker rm -f qbank-backend 2>/dev/null
docker rm -f qbank-frontend 2>/dev/null

# Remove volumes
echo ""
echo "3. Removing volumes..."
docker volume rm llm_powered_qbank_mongodb_data 2>/dev/null
docker volume rm llm_powered_qbank_mongodb_config 2>/dev/null
docker volume rm llm_powered_qbank_ollama_data 2>/dev/null

# Remove images
echo ""
echo "4. Removing images..."
docker rmi llm_powered_qbank-backend 2>/dev/null
docker rmi llm_powered_qbank-frontend 2>/dev/null

# Remove network
echo ""
echo "5. Removing network..."
docker network rm llm_powered_qbank_qbank-network 2>/dev/null

# Clean up dangling images and volumes
echo ""
echo "6. Cleaning up unused Docker resources..."
docker system prune -f --volumes 2>/dev/null

echo ""
echo "================================================"
echo "✅ Docker cleanup complete!"
echo "================================================"
echo ""
echo "What was removed:"
echo "  ✓ All QBank containers"
echo "  ✓ All QBank volumes (including database data)"
echo "  ✓ All QBank Docker images"
echo "  ✓ QBank network"
echo ""
echo "To start fresh, run: ./start.sh"
echo ""
