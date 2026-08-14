import os
import magic
from fastapi import HTTPException

# Configure max file size (e.g., 20 MB)
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 

ALLOWED_MIME_TYPES = {
    "text/plain": [".txt", ".csv"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/json": [".json"]
}

class FileValidator:
    @staticmethod
    def validate_size(file_content: bytes):
        if len(file_content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES} bytes.")

    @staticmethod
    def validate_type(file_content: bytes, filename: str):
        # Infer MIME type from content
        inferred_mime = magic.from_buffer(file_content, mime=True)
        
        # Check if MIME type is allowed
        if inferred_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {inferred_mime}")
            
        # Extension validation
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        
        if ext not in ALLOWED_MIME_TYPES[inferred_mime]:
            raise HTTPException(status_code=400, detail=f"File extension {ext} does not match content type {inferred_mime}")
            
        return inferred_mime
