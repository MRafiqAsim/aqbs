"""Processing API routes."""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from backend.models import (
    ProcessingStatus,
    ProcessingStatusResponse,
    GeneratedQuestionsResponse
)
from backend.services.upload_service import upload_service
from backend.services.extraction_service import extraction_service
from backend.services.question_service import question_service

router = APIRouter()


@router.get("/status/{file_id}", response_model=ProcessingStatusResponse)
async def get_processing_status(file_id: str):
    """
    Get processing status for a file.

    Args:
        file_id: Unique file identifier

    Returns:
        ProcessingStatusResponse with current status
    """
    try:
        upload_metadata = await upload_service.get_upload_status(file_id)

        # Map status to progress message
        progress_map = {
            "uploaded": "File uploaded, ready for processing",
            "extracting": "Extracting text from PDF...",
            "extracted": "Text extracted successfully",
            "generating": "Generating questions using LLM...",
            "ready": "Questions generated and ready for review",
            "failed": "Processing failed"
        }

        # Use custom progress message if available, otherwise use status-based message
        progress_message = upload_metadata.progress_message if upload_metadata.progress_message else progress_map.get(upload_metadata.status, "Unknown status")

        # Add progress percentage if generating
        if upload_metadata.status == "generating" and upload_metadata.progress_total > 0:
            percentage = int((upload_metadata.progress_current / upload_metadata.progress_total) * 100)
            progress_message = f"{progress_message} ({percentage}%)"

        return ProcessingStatusResponse(
            file_id=upload_metadata.file_id,
            filename=upload_metadata.filename,
            status=upload_metadata.status,
            progress=progress_message,
            error=upload_metadata.error
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )


@router.post("/extract/{file_id}")
async def extract_text(file_id: str, background_tasks: BackgroundTasks):
    """
    Extract text from uploaded PDF.

    Args:
        file_id: Unique file identifier
        background_tasks: FastAPI background tasks

    Returns:
        Status message
    """
    try:
        # Check if file exists
        await upload_service.get_upload_status(file_id)

        # Run extraction in background
        background_tasks.add_task(extraction_service.extract_text_from_pdf, file_id)

        return {
            "message": "Text extraction started",
            "file_id": file_id,
            "status": "extracting"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start extraction: {str(e)}"
        )


@router.post("/generate/{file_id}", response_model=GeneratedQuestionsResponse)
async def generate_questions(file_id: str, background_tasks: BackgroundTasks):
    """
    Generate questions from extracted text.

    Args:
        file_id: Unique file identifier
        background_tasks: FastAPI background tasks

    Returns:
        Status message (actual generation happens in background)
    """
    try:
        # Check if file exists
        await upload_service.get_upload_status(file_id)

        # Check if questions already generated
        existing_questions = await question_service.get_generated_questions(file_id)
        if existing_questions:
            return existing_questions

        # Run generation in background and return immediately
        # For synchronous response, we'll call it directly
        result = await question_service.generate_questions_from_file(file_id)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate questions: {str(e)}"
        )


@router.get("/questions/{file_id}", response_model=GeneratedQuestionsResponse)
async def get_generated_questions(file_id: str):
    """
    Get generated questions for a file.

    Args:
        file_id: Unique file identifier

    Returns:
        GeneratedQuestionsResponse with questions
    """
    try:
        result = await question_service.get_generated_questions(file_id)

        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No questions found for file {file_id}. Generate them first."
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve questions: {str(e)}"
        )


async def _run_pipeline_task(file_id: str):
    """Background task to run the full pipeline."""
    try:
        # Extract text
        await extraction_service.extract_text_from_pdf(file_id)

        # Generate questions
        await question_service.generate_questions_from_file(file_id)
    except Exception as e:
        # Update status to failed
        await upload_service.update_status(
            file_id,
            ProcessingStatus.FAILED,
            error=str(e)
        )


@router.post("/full-pipeline/{file_id}")
async def run_full_pipeline(file_id: str, background_tasks: BackgroundTasks):
    """
    Run the full pipeline: extract text and generate questions.

    Args:
        file_id: Unique file identifier
        background_tasks: FastAPI background tasks

    Returns:
        Status message (processing happens in background)
    """
    try:
        # Check if file exists
        await upload_service.get_upload_status(file_id)

        # Run pipeline in background
        background_tasks.add_task(_run_pipeline_task, file_id)

        return {
            "message": "Pipeline started",
            "file_id": file_id,
            "status": "processing"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start pipeline: {str(e)}"
        )
