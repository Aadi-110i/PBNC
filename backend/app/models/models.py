from sqlalchemy import Column, Integer, String, JSON, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base

class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)
    file_type = Column(String)
    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    parent_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    questions = relationship("Question", back_populates="document", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    question_number = Column(String, nullable=True)
    question_text = Column(String)
    options = Column(JSON, nullable=True)  # List of strings or objects
    answer = Column(String, nullable=True)
    question_type = Column(String, nullable=True)
    source_pages = Column(JSON, nullable=True) # List of page numbers
    confidence = Column(Float, default=0.0)
    metadata_json = Column(JSON, nullable=True)
    
    document = relationship("Document", back_populates="questions")
