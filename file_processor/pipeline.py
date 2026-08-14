import hashlib
from typing import Tuple
from .validator import FileValidator
from .malware_scanner import MalwareScanner
from .extractors import FileExtractor

class FileProcessingPipeline:
    def __init__(self):
        self.validator = FileValidator()
        self.malware_scanner = MalwareScanner()
        self.extractor = FileExtractor()
        
    def process(self, file_content: bytes, filename: str) -> Tuple[str, str, str]:
        """
        Process the file and return (extracted_text, file_hash, mime_type).
        """
        # 1. Size Validation
        self.validator.validate_size(file_content)
        
        # 2. Type & Extension Validation
        mime_type = self.validator.validate_type(file_content, filename)
        
        # 3. Hashing for chain of custody
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # 4. Malware Scanning
        self.malware_scanner.scan(file_content)
        
        # 5. Content Extraction
        extracted_text = self.extractor.extract_text(file_content, mime_type)
        
        return extracted_text, file_hash, mime_type
