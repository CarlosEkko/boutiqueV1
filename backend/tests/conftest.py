"""
Test configuration - credentials loaded from environment or test_credentials.md
"""
import os

# Test credentials - loaded from environment variables with fallbacks
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "carlos@kbex.io")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")
TEST_USER_EMAIL = os.getenv("TEST_USER_EMAIL", "testuser@kbex.io")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "senha123")

# API URL
API_URL = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")
if not API_URL.endswith("/api"):
    API_BASE = f"{API_URL}/api"
else:
    API_BASE = API_URL
