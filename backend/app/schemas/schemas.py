from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from app.models.models import ProcessingStatus

class QuestionBase(BaseModel):
    question_number: Optional[str] = None
    question_text: str
    options: Optional[List[Any]] = None
    answer: Optional[str] = None
    question_type: Optional[str] = None
    source_pages: Optional[List[int]] = None
    confidence: float = 0.0

class QuestionCreate(QuestionBase):
    document_id: int

class Question(QuestionBase):
    id: int
    document_id: int
    
    model_config = ConfigDict(from_attributes=True)

class DocumentBase(BaseModel):
    filename: str
    file_type: str
    parent_id: Optional[int] = None

class DocumentCreate(DocumentBase):
    file_path: str

class Document(DocumentBase):
    id: int
    status: ProcessingStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DocumentWithQuestions(Document):
    questions: List[Question] = []

class QuestionUpdate(BaseModel):
    answer: Optional[str] = None
    question_text: Optional[str] = None
