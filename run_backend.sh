#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Run FastAPI server
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
