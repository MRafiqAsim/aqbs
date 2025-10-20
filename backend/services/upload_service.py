"""File upload service."""
import os
import uuid
from datetime import datetime
from fastapi import UploadFile, HTTPException
from backend.config import settings
from backend.models import db_manager, UploadResponse, UploadMetadata, ProcessingStatus


class UploadService:
    """Handles file upload operations."""

    @staticmethod
    async def save_upload(file: UploadFile) -> UploadResponse:
        """
        Save uploaded PDF file and create metadata.

        Args:
            file: Uploaded PDF file

        Returns:
            UploadResponse with file metadata
        """
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported"
            )

        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = '.pdf'
        saved_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(settings.upload_dir, saved_filename)

        # Save file to disk
        try:
            contents = await file.read()
            with open(file_path, 'wb') as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file: {str(e)}"
            )

        # Create metadata document
        upload_time = datetime.utcnow()
        metadata = UploadMetadata(
            file_id=file_id,
            filename=file.filename,
            file_path=file_path,
            status=ProcessingStatus.UPLOADED,
            upload_time=upload_time
        )

        # Save metadata to database
        db = db_manager.get_database()
        await db.uploads.insert_one(metadata.dict(by_alias=True, exclude={"id"}))

        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            status=ProcessingStatus.UPLOADED,
            message="File uploaded successfully",
            upload_time=upload_time
        )

    @staticmethod
    async def get_upload_status(file_id: str) -> UploadMetadata:
        """
        Get upload metadata by file ID.

        Args:
            file_id: Unique file identifier

        Returns:
            UploadMetadata
        """
        db = db_manager.get_database()
        upload = await db.uploads.find_one({"file_id": file_id})

        if not upload:
            raise HTTPException(
                status_code=404,
                detail=f"File with ID {file_id} not found"
            )

        return UploadMetadata(**upload)

    @staticmethod
    async def update_status(
        file_id: str,
        status: ProcessingStatus,
        error: str = None
    ):
        """
        Update processing status for a file.

        Args:
            file_id: Unique file identifier
            status: New processing status
            error: Error message if status is FAILED
        """
        db = db_manager.get_database()
        update_data = {"status": status}

        if error:
            update_data["error"] = error

        result = await db.uploads.update_one(
            {"file_id": file_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail=f"File with ID {file_id} not found"
            )

    @staticmethod
    async def set_extracted_text_path(file_id: str, text_path: str):
        """Set the extracted text file path."""
        db = db_manager.get_database()
        await db.uploads.update_one(
            {"file_id": file_id},
            {"$set": {"extracted_text_path": text_path}}
        )

    @staticmethod
    async def set_generated_questions_path(file_id: str, questions_path: str):
        """Set the generated questions file path."""
        db = db_manager.get_database()
        await db.uploads.update_one(
            {"file_id": file_id},
            {"$set": {"generated_questions_path": questions_path}}
        )

    @staticmethod
    async def update_progress(
        file_id: str,
        current: int,
        total: int,
        message: str = None
    ):
        """
        Update processing progress for a file.

        Args:
            file_id: Unique file identifier
            current: Current progress count
            total: Total items to process
            message: Optional progress message
        """
        db = db_manager.get_database()
        update_data = {
            "progress_current": current,
            "progress_total": total
        }

        if message:
            update_data["progress_message"] = message

        await db.uploads.update_one(
            {"file_id": file_id},
            {"$set": update_data}
        )


# Global instance
upload_service = UploadService()
