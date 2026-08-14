import os
from typing import Dict, Any, List
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class FindingResponse(BaseModel):
    category: str = Field(description="The risk category: SAFE, FINANCIAL, LEGAL, PII, SOURCE_CODE, CREDENTIALS, or OTHER_RISK")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    evidence: str = Field(description="A short explanation or the specific snippet that triggered the categorization")

class ReasoningAgent:
    def __init__(self):
        # We try to initialize the LLM. If OPENAI_API_KEY is missing, we will fallback gracefully.
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.is_available = bool(self.api_key)
        
        if self.is_available:
            self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.0)
            self.parser = JsonOutputParser(pydantic_object=FindingResponse)
            
            prompt_template = """
You are an expert Enterprise Data Security Analyst.
Your job is to determine if the following text contains sensitive organizational data, credentials, source code, legal matters, or PII.

Analyze the text and return a JSON object with your findings.
If the text is completely harmless, categorize it as SAFE with high confidence (e.g., 0.99).

Text to analyze:
{text}

{format_instructions}
"""
            self.prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["text"],
                partial_variables={"format_instructions": self.parser.get_format_instructions()}
            )
            self.chain = self.prompt | self.llm | self.parser
        else:
            logger.warning("OPENAI_API_KEY not found. ReasoningAgent will return mock results or error.")

    def invoke(self, text: str) -> List[Dict[str, Any]]:
        if not self.is_available:
            # Fallback for local testing without API key
            return [{
                "category": "SAFE",
                "confidence": 0.5,
                "detector_source": "LANGGRAPH_AGENT (MOCK)",
                "evidence": "LLM API Key missing, returning mock SAFE response."
            }]
            
        try:
            result = self.chain.invoke({"text": text})
            # Convert single dict response to expected list format
            return [{
                "category": result.get("category", "UNKNOWN"),
                "confidence": float(result.get("confidence", 0.0)),
                "detector_source": "LANGGRAPH_AGENT",
                "evidence": str(result.get("evidence", ""))
            }]
        except Exception as e:
            logger.error(f"ReasoningAgent LLM failure: {e}")
            raise e
