# Autonomous Question Bank System Using Generative AI

A complete LLM-powered question bank system that extracts text from PDFs and generates educational questions using AI. Upload PDFs, review generated questions, and save them to your database.

## Features

- PDF upload and intelligent text extraction
- LLM-powered question generation (MCQ, Fill-in-the-Blank, True/False)
- Interactive review and edit interface
- MongoDB storage for approved questions
- Multiple LLM provider support (MLX, Ollama, OpenAI)

## Quick Start Guide

Choose your setup based on what you have installed:

### Option A: Mac Apple Silicon (Recommended - Fastest)

**Prerequisites:**
- macOS with Apple Silicon (M1/M2/M3)
- Homebrew
- Docker Desktop

**Setup Steps:**

```bash
# 1. Install dependencies
brew install python@3.11 node

# 2. Clone and setup
git clone <repository-url>
cd llm_powered_Qbank

# 3. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Install frontend dependencies
cd frontend
npm install
cd ..

# 6. Setup environment
cp .env.example .env

# 7. Start the application
chmod +x start.sh
./start.sh
# Choose Option 1 (MLX - Local) for best performance
```
### Option B: Docker Only (Any Platform)

**Prerequisites:**
- Docker Desktop installed and running

**Setup Steps:**

```bash
# 1. Clone repository
git clone <repository-url>
cd llm_powered_Qbank

# 2. Start everything in Docker
chmod +x docker-start-with-ollama.sh
./docker-start-with-ollama.sh
```

**First run:** Downloads Llama 3 model ~4.7GB (10-15 minutes)
**Processing speed:** Slower (CPU-based)

**Alternative:** Run `./start.sh` and choose Option 2 (Docker with Ollama)

### Option C: OpenAI API (Any Platform - Fastest Processing)

**Prerequisites:**
- Python 3.10+, Node.js 18+, Docker Desktop
- OpenAI API key

**Setup Steps:**

```bash
# 1. Follow steps 1-6 from Option A

# 2. Edit .env file and add your API key
# Change these lines:
# LLM_PROVIDER=openai
# MODEL_NAME=gpt-4o-mini
# OPENAI_API_KEY=your_key_here

# 3. Start the application
./start.sh
# Choose Option 3 (OpenAI API)
```

## Access Points

After starting, access the application at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: localhost:27017

## What Happens During Startup

The startup script automatically:
1. Checks and starts MongoDB (Docker container)
2. Clears any processes using ports 8000 and 3000
3. Starts the backend API server (port 8000)
4. Starts the Next.js frontend (port 3000)
5. Displays access URLs and ready status

## Usage Workflow

1. Open http://localhost:3000 in your browser
2. Upload a PDF document
3. System automatically extracts text and generates questions
4. Review, edit, or regenerate questions as needed
5. Save approved questions to MongoDB

## Stopping the Application

**For Option A (MLX) or Option C (OpenAI):**
```bash
# Press Ctrl+C in the terminal running start.sh
# This stops both backend and frontend
```

**For Option B (Docker with Ollama):**
```bash
docker-compose down
```

**Stop all services (any option):**
```bash
./stop.sh
```

**Complete cleanup (remove all Docker containers/volumes):**
```bash
./clean.sh
```

## LLM Provider Configuration

All three providers are pre-configured. Switch by editing `.env`:

**MLX (Default):**
```env
LLM_PROVIDER=mlx
MODEL_NAME=mlx-community/Meta-Llama-3-8B-Instruct-4bit
```

**Ollama:**
```env
LLM_PROVIDER=ollama
MODEL_NAME=llama3:8b
```

**OpenAI:**
```env
LLM_PROVIDER=openai
MODEL_NAME=gpt-4o-mini
OPENAI_API_KEY=your_key_here
```

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Error
```bash
docker start qbank-mongodb
# or
docker run -d -p 27017:27017 --name qbank-mongodb mongo:7.0
```

### MLX Model Not Loading
On first run, MLX downloads ~4GB model. Check backend logs for progress. Subsequent runs use cached model.

### Frontend Shows Connection Error
```bash
# Verify backend is running
curl http://localhost:8000/health
# Should return: {"status":"healthy",...}
```

## Project Structure

```
llm_powered_Qbank/
├── backend/              # FastAPI backend
│   ├── api/             # API routes
│   ├── models/          # Database schemas
│   ├── services/        # Business logic
│   └── config/          # Configuration
├── frontend/            # Next.js frontend
├── ml/                  # ML inference & prompts
│   ├── inference/       # LLM service
│   └── prompts/         # Prompt templates
├── uploads/             # PDF uploads
├── extracted_text/      # Extracted text cache
├── generated_questions/ # Generated questions
├── models/              # MLX model cache
└── start.sh            # Main startup script
```

## Configuration Options

Key `.env` settings:

```env
# Question generation
DEFAULT_QUESTIONS_PER_CHUNK=5
MAX_CHUNK_SIZE=2000
CHUNK_OVERLAP=200

# LLM settings
MLX_TEMPERATURE=0.7
MLX_MAX_TOKENS=2000

# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=qbank
```

## API Endpoints

- `POST /api/upload/` - Upload PDF
- `POST /api/process/full-pipeline/{file_id}` - Extract text and generate questions
- `GET /api/process/questions/{file_id}` - Get generated questions
- `POST /api/questions/save` - Save approved questions to database
- `GET /api/questions/` - List all saved questions

Full API documentation available at http://localhost:8000/docs

## Support

For issues or questions, check the troubleshooting section or review the API documentation at `/docs`.

---

**Built with FastAPI, Next.js, MLX, and Meta-Llama-3**
