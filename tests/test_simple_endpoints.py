"""
Simple test for endpoints that don't require full module imports
"""
import sys
from unittest import mock

# Mock the problematic modules to prevent import errors
mock_modules = ['monolithic_backend.routers', 'monolithic_backend.services', 'monolithic_backend.database', 'monolithic_backend.utils']
for module in mock_modules:
    sys.modules[module] = mock.Mock()

# Import the app after mocking
from monolithic_backend.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "基金监控系统 API", "version": "1.0.0"}

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
