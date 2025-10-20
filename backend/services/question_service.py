"""Question generation and management service."""
import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.config import settings
from backend.models import (
    db_manager,
    Question,
    QuestionCreate,
    ProcessingStatus,
    GeneratedQuestionsResponse
)
from backend.services.upload_service import upload_service
from backend.services.extraction_service import extraction_service
from ml.inference import llm_service


class QuestionService:
    """Handles question generation and management."""

    async def generate_questions_from_file(self, file_id: str) -> GeneratedQuestionsResponse:
        """
        Generate questions from uploaded PDF file.

        Args:
            file_id: Unique file identifier

        Returns:
            GeneratedQuestionsResponse with generated questions
        """
        try:
            # Update status to GENERATING
            await upload_service.update_status(file_id, ProcessingStatus.GENERATING)

            # Get or extract text
            text = await extraction_service.get_extracted_text(file_id)
            if not text:
                # Extract text if not already done
                text = await extraction_service.extract_text_from_pdf(file_id)

            # Chunk text for processing
            chunks = extraction_service.chunk_text(text)
            total_chunks = len(chunks)
            print(f"Processing {total_chunks} chunks for file {file_id}")

            # Initialize progress
            await upload_service.update_progress(
                file_id,
                0,
                total_chunks,
                "Starting question generation..."
            )

            all_questions = []

            # Process chunks sequentially
            for idx, chunk in enumerate(chunks):
                try:
                    current_chunk = idx + 1
                    print(f"Processing chunk {current_chunk}/{total_chunks}")

                    # Update progress
                    await upload_service.update_progress(
                        file_id,
                        current_chunk,
                        total_chunks,
                        f"Processing chunk {current_chunk}/{total_chunks}"
                    )

                    # Generate questions for this chunk
                    result = llm_service.generate_questions(chunk)

                    if "questions" in result:
                        for q_data in result["questions"]:
                            # Add file_id and timestamps
                            q_data["file_id"] = file_id
                            q_data["created_at"] = datetime.utcnow()
                            all_questions.append(q_data)

                        print(f"Chunk {current_chunk} complete. Total questions: {len(all_questions)}")

                except Exception as e:
                    print(f"Error generating questions for chunk {idx}: {e}")
                    # Continue with next chunk even if this one fails

            if not all_questions:
                raise ValueError("No questions were generated from the text")

            # Save generated questions to file
            questions_filename = f"{file_id}.json"
            questions_path = os.path.join(
                settings.generated_questions_dir,
                questions_filename
            )

            with open(questions_path, 'w', encoding='utf-8') as f:
                json.dump({"questions": all_questions}, f, indent=2, default=str)

            # Update metadata
            await upload_service.set_generated_questions_path(file_id, questions_path)
            await upload_service.update_status(file_id, ProcessingStatus.READY)

            # Convert to Question objects
            questions = [Question(**q) for q in all_questions]

            return GeneratedQuestionsResponse(
                file_id=file_id,
                questions=questions,
                total_count=len(questions),
                status=ProcessingStatus.READY
            )

        except Exception as e:
            await upload_service.update_status(
                file_id,
                ProcessingStatus.FAILED,
                error=f"Question generation failed: {str(e)}"
            )
            raise

    async def get_generated_questions(self, file_id: str) -> Optional[GeneratedQuestionsResponse]:
        """
        Get previously generated questions for a file.

        Args:
            file_id: Unique file identifier

        Returns:
            GeneratedQuestionsResponse or None
        """
        upload_metadata = await upload_service.get_upload_status(file_id)

        if not upload_metadata.generated_questions_path:
            return None

        if not os.path.exists(upload_metadata.generated_questions_path):
            return None

        # Load questions from file
        with open(upload_metadata.generated_questions_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        questions = [Question(**q) for q in data["questions"]]

        return GeneratedQuestionsResponse(
            file_id=file_id,
            questions=questions,
            total_count=len(questions),
            status=upload_metadata.status
        )

    async def save_questions_to_db(
        self,
        file_id: str,
        questions: List[QuestionCreate]
    ) -> List[str]:
        """
        Save reviewed questions to MongoDB.

        Args:
            file_id: Unique file identifier
            questions: List of questions to save

        Returns:
            List of inserted question IDs
        """
        db = db_manager.get_database()

        # Prepare questions for insertion
        questions_data = []
        now = datetime.utcnow()

        for q in questions:
            q_dict = q.dict()
            q_dict["file_id"] = file_id
            q_dict["created_at"] = now
            q_dict["updated_at"] = now
            questions_data.append(q_dict)

        # Insert into database
        result = await db.questions.insert_many(questions_data)

        return [str(id) for id in result.inserted_ids]

    async def get_questions(
        self,
        skip: int = 0,
        limit: int = 100,
        question_type: Optional[str] = None,
        difficulty: Optional[str] = None,
        topic: Optional[str] = None
    ) -> List[Question]:
        """
        Retrieve questions from database with filters.

        Args:
            skip: Number of questions to skip
            limit: Maximum number of questions to return
            question_type: Filter by question type
            difficulty: Filter by difficulty
            topic: Filter by topic

        Returns:
            List of questions
        """
        db = db_manager.get_database()

        # Build filter
        filter_dict = {}
        if question_type:
            filter_dict["type"] = question_type
        if difficulty:
            filter_dict["difficulty"] = difficulty
        if topic:
            filter_dict["topic"] = {"$regex": topic, "$options": "i"}

        # Query database
        cursor = db.questions.find(filter_dict).skip(skip).limit(limit)
        questions_data = await cursor.to_list(length=limit)

        return [Question(**q) for q in questions_data]

    async def get_question_by_id(self, question_id: str) -> Optional[Question]:
        """Get a single question by ID."""
        from bson import ObjectId

        db = db_manager.get_database()
        question_data = await db.questions.find_one({"_id": ObjectId(question_id)})

        if not question_data:
            return None

        return Question(**question_data)

    async def update_question(
        self,
        question_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """
        Update a question.

        Args:
            question_id: Question ID
            updates: Dictionary of fields to update

        Returns:
            True if updated successfully
        """
        from bson import ObjectId

        db = db_manager.get_database()
        updates["updated_at"] = datetime.utcnow()

        result = await db.questions.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": updates}
        )

        return result.modified_count > 0

    async def delete_question(self, question_id: str) -> bool:
        """
        Delete a question.

        Args:
            question_id: Question ID

        Returns:
            True if deleted successfully
        """
        from bson import ObjectId

        db = db_manager.get_database()
        result = await db.questions.delete_one({"_id": ObjectId(question_id)})

        return result.deleted_count > 0


# Global instance
question_service = QuestionService()
