"""PDF text extraction service."""
import os
import pymupdf4llm
from typing import Optional
from backend.config import settings
from backend.models import ProcessingStatus
from backend.services.upload_service import upload_service


class ExtractionService:
    """Handles PDF text extraction."""

    @staticmethod
    async def extract_text_from_pdf(file_id: str) -> str:
        """
        Extract text from PDF file.

        Args:
            file_id: Unique file identifier

        Returns:
            Extracted text as string
        """
        # Update status to EXTRACTING
        await upload_service.update_status(file_id, ProcessingStatus.EXTRACTING)

        try:
            # Get upload metadata
            upload_metadata = await upload_service.get_upload_status(file_id)
            pdf_path = upload_metadata.file_path

            if not os.path.exists(pdf_path):
                raise FileNotFoundError(f"PDF file not found: {pdf_path}")

            # Extract text using pymupdf4llm (optimized for LLM processing)
            # This handles both text-based and image-based PDFs
            md_text = pymupdf4llm.to_markdown(pdf_path)

            if not md_text or len(md_text.strip()) == 0:
                raise ValueError("No text could be extracted from PDF")

            # Save extracted text
            text_filename = f"{file_id}.txt"
            text_path = os.path.join(settings.extracted_text_dir, text_filename)

            with open(text_path, 'w', encoding='utf-8') as f:
                f.write(md_text)

            # Update metadata
            await upload_service.set_extracted_text_path(file_id, text_path)
            await upload_service.update_status(file_id, ProcessingStatus.EXTRACTED)

            return md_text

        except Exception as e:
            # Update status to FAILED
            await upload_service.update_status(
                file_id,
                ProcessingStatus.FAILED,
                error=f"Extraction failed: {str(e)}"
            )
            raise

    @staticmethod
    async def get_extracted_text(file_id: str) -> Optional[str]:
        """
        Get previously extracted text.

        Args:
            file_id: Unique file identifier

        Returns:
            Extracted text or None if not yet extracted
        """
        upload_metadata = await upload_service.get_upload_status(file_id)

        if not upload_metadata.extracted_text_path:
            return None

        if not os.path.exists(upload_metadata.extracted_text_path):
            return None

        with open(upload_metadata.extracted_text_path, 'r', encoding='utf-8') as f:
            return f.read()

    @staticmethod
    def chunk_text(text: str, max_chunk_size: int = None, overlap: int = None) -> list[str]:
        """
        Split text into chunks for processing.

        Args:
            text: Text to chunk
            max_chunk_size: Maximum chunk size in characters
            overlap: Number of characters to overlap between chunks

        Returns:
            List of text chunks
        """
        if max_chunk_size is None:
            max_chunk_size = settings.max_chunk_size

        if overlap is None:
            overlap = settings.chunk_overlap

        if len(text) <= max_chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + max_chunk_size

            # Try to break at paragraph boundary
            if end < len(text):
                # Look for paragraph break
                paragraph_break = text.rfind('\n\n', start, end)
                if paragraph_break > start:
                    end = paragraph_break

                # If no paragraph break, look for sentence break
                elif '.' in text[start:end]:
                    sentence_break = text.rfind('.', start, end) + 1
                    if sentence_break > start:
                        end = sentence_break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # Move to next chunk with overlap
            start = end - overlap if end < len(text) else end

        return chunks


# Global instance
extraction_service = ExtractionService()
