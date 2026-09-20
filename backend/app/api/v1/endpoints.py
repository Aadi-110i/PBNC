from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.Document)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a document (PDF or image) for AI-powered question extraction."""
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Only PDF and Images (JPEG/PNG) are supported."
        )

    file_ext = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    db_document = models.Document(
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        status=models.ProcessingStatus.PENDING
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # Trigger background Celery task
    from app.worker.tasks import process_document_task
    process_document_task.delay(db_document.id)

    return db_document


@router.post("/documents/{document_id}/reprocess", response_model=schemas.Document)
def reprocess_document(document_id: int, db: Session = Depends(get_db)):
    """Re-trigger AI extraction for a failed or completed document."""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete existing questions
    db.query(models.Question).filter(models.Question.document_id == document_id).delete()
    document.status = models.ProcessingStatus.PENDING
    db.commit()
    db.refresh(document)

    from app.worker.tasks import process_document_task
    process_document_task.delay(document_id)

    return document


@router.get("/documents", response_model=List[schemas.Document])
def list_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all uploaded documents."""
    return db.query(models.Document).order_by(models.Document.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/documents/{document_id}", response_model=schemas.DocumentWithQuestions)
def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get a document and all its extracted questions."""
    db_document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return db_document


@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document and its extracted questions."""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove physical file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.query(models.Question).filter(models.Question.document_id == document_id).delete()
    db.delete(document)
    db.commit()
    return {"message": f"Document {document_id} deleted successfully"}


@router.post("/documents/{document_id}/link_answer_key", response_model=schemas.Document)
def link_answer_key(document_id: int, answer_key_id: int, db: Session = Depends(get_db)):
    """Link an answer key document to a question paper."""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    answer_key = db.query(models.Document).filter(models.Document.id == answer_key_id).first()
    if not answer_key:
        raise HTTPException(status_code=404, detail="Answer key document not found")

    document.parent_id = answer_key.id
    db.commit()
    db.refresh(document)
    return document


@router.get("/questions", response_model=List[schemas.Question])
def list_questions(document_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all extracted questions, optionally filtered by document."""
    query = db.query(models.Question)
    if document_id:
        query = query.filter(models.Question.document_id == document_id)
    return query.offset(skip).limit(limit).all()


@router.get("/questions/review", response_model=List[schemas.Question])
def list_questions_for_review(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get questions that need human review (low confidence or missing answer)."""
    query = db.query(models.Question).filter(
        (models.Question.confidence < 0.8) | (models.Question.answer == None)
    )
    return query.offset(skip).limit(limit).all()


@router.put("/questions/{question_id}", response_model=schemas.Question)
def update_question(question_id: int, question_update: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    """Update a question's answer or text (human review correction)."""
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if question_update.answer is not None:
        question.answer = question_update.answer
        question.confidence = 1.0  # Human confirmed = full confidence
    if question_update.question_text is not None:
        question.question_text = question_update.question_text

    db.commit()
    db.refresh(question)
    return question


@router.get("/questions/{question_id}", response_model=schemas.Question)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question
