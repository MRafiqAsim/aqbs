"""Upload API routes."""
import os
import json
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.models import UploadResponse
from backend.services.upload_service import upload_service
from backend.config import settings

router = APIRouter()


@router.post("/", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file for processing.

    Args:
        file: PDF file to upload

    Returns:
        UploadResponse with file metadata
    """
    try:
        response = await upload_service.save_upload(file)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("/files")
async def list_files():
    """
    List all uploaded files with their question counts.

    Returns:
        List of files with metadata
    """
    try:
        from backend.models import db_manager

        files_data = []
        generated_dir = settings.generated_questions_dir

        if os.path.exists(generated_dir):
            for filename in os.listdir(generated_dir):
                if filename.endswith('.json'):
                    file_id = filename.replace('.json', '')
                    file_path = os.path.join(generated_dir, filename)

                    try:
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            question_count = len(data.get('questions', []))

                        # Get file metadata from MongoDB
                        upload_metadata = await db_manager.db.uploads.find_one(
                            {'file_id': file_id}
                        )

                        if upload_metadata:
                            original_filename = upload_metadata.get('filename', f"{file_id}.pdf")
                            upload_time = upload_metadata.get('upload_time').timestamp()
                        else:
                            stat = os.stat(file_path)
                            original_filename = f"{file_id}.pdf"
                            upload_time = stat.st_ctime

                        files_data.append({
                            'fileId': file_id,
                            'filename': original_filename,
                            'questionCount': question_count,
                            'uploadTime': upload_time
                        })
                    except Exception as e:
                        print(f"Error reading file {filename}: {e}")
                        continue

        # Sort by upload time (newest first)
        files_data.sort(key=lambda x: x['uploadTime'], reverse=True)

        return files_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )
