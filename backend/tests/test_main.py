import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine

# Create the test client
client = TestClient(app)

def setup_module(module):
    # Setup test DB tables
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    # Teardown test DB tables (optional)
    pass

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to PBNC Document Intelligence API"}

def test_list_documents():
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_list_questions():
    response = client.get("/api/v1/questions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_questions_review():
    response = client.get("/api/v1/questions/review")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
