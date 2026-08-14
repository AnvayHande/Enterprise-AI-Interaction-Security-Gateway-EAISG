from typing import List, Dict, Any

class Sanitizer:
    """
    Redacts sensitive content from text based on findings from the detection engine.
    """
    def redact_text(self, text: str, findings: List[Dict[str, Any]]) -> str:
        if not text or not findings:
            return text

        # Filter out findings that don't have positional data
        redactable = [f for f in findings if f.get("start_idx") is not None and f.get("end_idx") is not None]
        
        # Sort by start_idx descending so that replacements at the end of the string
        # don't shift the indices for replacements at the beginning of the string.
        # If two findings share the exact same start_idx (e.g. overlap), sort by end_idx descending.
        redactable.sort(key=lambda x: (x["start_idx"], x["end_idx"]), reverse=True)

        sanitized_text = text
        last_redacted_start = len(text) + 1

        for finding in redactable:
            start = finding["start_idx"]
            end = finding["end_idx"]
            category = finding["category"]

            # Prevent overlapping redactions from corrupting each other
            if end > last_redacted_start:
                continue

            placeholder = f"<{category}_REDACTED>"
            sanitized_text = sanitized_text[:start] + placeholder + sanitized_text[end:]
            last_redacted_start = start

        return sanitized_text
