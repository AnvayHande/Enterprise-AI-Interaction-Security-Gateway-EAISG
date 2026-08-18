import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from database.models import Base, User, Request, Finding
from database.session import get_db

# Setup a test database (in-memory SQLite)
engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# In a real test, you'd override get_current_user too
def override_get_current_user():
    return User(id=1, username="testadmin", role="ADMIN")

app.dependency_overrides[get_db] = override_get_db
from security.dependencies import get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_dashboard_overview():
    response = client.get("/api/v1/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "decisions" in data
    assert "average_risk" in data

def test_dashboard_requests():
    response = client.get("/api/v1/dashboard/requests")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_dashboard_findings():
    response = client.get("/api/v1/dashboard/findings")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_dashboard_users():
    response = client.get("/api/v1/dashboard/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
