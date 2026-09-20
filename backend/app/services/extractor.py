import os
import base64
from typing import List, Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)


class DocumentExtractor:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
            self.model_id = "gemini-2.0-flash"
            logger.info("Gemini AI client initialised successfully.")
        else:
            self.client = None
            logger.warning("GEMINI_API_KEY not set. Falling back to mock extraction.")

    def extract_questions(self, file_path: str, file_type: str) -> List[Dict[str, Any]]:
        if not self.client:
            return self._mock_extraction()

        try:
            logger.info(f"Reading {file_path} for inline upload to Gemini")

            # Read file and send inline (no Files API — works with all key types)
            with open(file_path, "rb") as f:
                file_bytes = f.read()

            prompt = """
Carefully read this document and extract every question you find.
For each question provide:
- question_number: label/number (string)
- question_text: full question text (string)
- options: answer choices if multiple choice (list of strings, or null)
- answer: correct answer if visible (string, or null)
- question_type: "Multiple Choice", "True/False", "Short Answer", "Subjective" etc (string)
- source_pages: page numbers (list of integers)
- confidence: 0.0 to 1.0 (float)

Return ONLY a valid JSON array. No markdown, no explanation, just raw JSON array.
"""

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    types.Part(
                        inline_data=types.Blob(
                            data=file_bytes,
                            mime_type=file_type,
                        )
                    ),
                    types.Part(text=prompt),
                ],
            )

            text_response = response.text.strip()
            logger.info(f"Got Gemini response, length={len(text_response)}")

            # Strip markdown code fences if present
            if "```" in text_response:
                lines = text_response.split("\n")
                text_response = "\n".join(
                    line for line in lines if not line.strip().startswith("```")
                ).strip()

            result = json.loads(text_response)
            logger.info(f"Successfully extracted {len(result)} questions.")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error from Gemini response: {e}")
            raise
        except Exception as e:
            logger.error(f"AI Extraction failed: {e}")
            raise

    def _mock_extraction(self) -> List[Dict[str, Any]]:
        return [
            {
                "question_number": "1",
                "question_text": "Placeholder: GEMINI_API_KEY is not set.",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": "Option A",
                "question_type": "Multiple Choice",
                "source_pages": [1],
                "confidence": 0.5,
            }
        ]
