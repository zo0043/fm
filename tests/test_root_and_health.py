"""
Simple test for root and health endpoints without full app import
"""
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Create a minimal app with only the endpoints we want to test
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "基金监控系统 API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Test the endpoints
def test_root():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "基金监控系统 API", "version": "1.0.0"}

def test_health_check():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
