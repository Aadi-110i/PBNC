from .celery_app import celery_app
from app.models import models
from app.core.database import SessionLocal
from app.services.extractor import DocumentExtractor
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name="process_document_task")
def process_document_task(document_id: int):
    db = SessionLocal()
    try:
        document = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not document:
            logger.error(f"Document {document_id} not found")
            return

        document.status = models.ProcessingStatus.PROCESSING
        db.commit()

        # Initialize extractor
        extractor = DocumentExtractor()
        
        # Process document
        questions_data = extractor.extract_questions(document.file_path, document.file_type)

        # Save extracted questions
        for q_data in questions_data:
            db_question = models.Question(
                document_id=document.id,
                question_number=q_data.get("question_number"),
                question_text=q_data.get("question_text"),
                options=q_data.get("options"),
                answer=q_data.get("answer"),
                question_type=q_data.get("question_type"),
                source_pages=q_data.get("source_pages"),
                confidence=q_data.get("confidence", 0.0),
                metadata_json=q_data.get("metadata")
            )
            db.add(db_question)

        document.status = models.ProcessingStatus.COMPLETED
        db.commit()
        logger.info(f"Document {document_id} processed successfully")

    except Exception as e:
        logger.exception(f"Error processing document {document_id}")
        if document:
            document.status = models.ProcessingStatus.FAILED
            db.commit()
    finally:
        db.close()
