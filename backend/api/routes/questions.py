"""Questions API routes."""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from backend.models import (
    Question,
    QuestionUpdate,
    SaveQuestionsRequest,
    SaveQuestionsResponse
)
from backend.services.question_service import question_service

router = APIRouter()


@router.get("/", response_model=List[Question])
async def get_questions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None
):
    """
    Get questions from database with optional filters.

    Args:
        skip: Number of questions to skip
        limit: Maximum number of questions to return
        question_type: Filter by question type (mcq, fill_in_blank, true_false)
        difficulty: Filter by difficulty (easy, medium, hard)
        topic: Filter by topic (partial match)

    Returns:
        List of questions
    """
    try:
        questions = await question_service.get_questions(
            skip=skip,
            limit=limit,
            question_type=question_type,
            difficulty=difficulty,
            topic=topic
        )
        return questions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve questions: {str(e)}"
        )


@router.get("/{question_id}", response_model=Question)
async def get_question(question_id: str):
    """
    Get a single question by ID.

    Args:
        question_id: Question ID

    Returns:
        Question object
    """
    question = await question_service.get_question_by_id(question_id)

    if not question:
        raise HTTPException(
            status_code=404,
            detail=f"Question with ID {question_id} not found"
        )

    return question


@router.put("/{question_id}", response_model=Question)
async def update_question(question_id: str, updates: QuestionUpdate):
    """
    Update a question.

    Args:
        question_id: Question ID
        updates: Fields to update

    Returns:
        Updated question
    """
    # Filter out None values
    update_data = {k: v for k, v in updates.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update data provided"
        )

    success = await question_service.update_question(question_id, update_data)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Question with ID {question_id} not found"
        )

    # Return updated question
    return await question_service.get_question_by_id(question_id)


@router.delete("/{question_id}")
async def delete_question(question_id: str):
    """
    Delete a question.

    Args:
        question_id: Question ID

    Returns:
        Success message
    """
    success = await question_service.delete_question(question_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Question with ID {question_id} not found"
        )

    return {"message": "Question deleted successfully", "question_id": question_id}


@router.post("/save", response_model=SaveQuestionsResponse)
async def save_questions(request: SaveQuestionsRequest):
    """
    Save reviewed questions to database.

    Args:
        request: Request containing file_id and list of questions

    Returns:
        SaveQuestionsResponse with saved question IDs
    """
    try:
        question_ids = await question_service.save_questions_to_db(
            file_id=request.file_id,
            questions=request.questions
        )

        return SaveQuestionsResponse(
            saved_count=len(question_ids),
            message=f"Successfully saved {len(question_ids)} questions",
            question_ids=question_ids
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save questions: {str(e)}"
        )
