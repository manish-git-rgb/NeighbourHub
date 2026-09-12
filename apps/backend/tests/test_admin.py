import os
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


ADMIN_EMAIL = os.getenv(
    "TEST_ADMIN_EMAIL",
    "neighboruser@example.com",
)

ADMIN_PASSWORD = os.getenv(
    "TEST_ADMIN_PASSWORD",
)


# -------------------------
# Get Admin Token
# -------------------------

def get_admin_token():
    if not ADMIN_PASSWORD:
        raise RuntimeError(
            "TEST_ADMIN_PASSWORD is not set"
        )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


# -------------------------
# List Users
# -------------------------

def test_admin_list_users():
    token = get_admin_token()

    response = client.get(
        "/api/v1/admin/users",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "pagination" in data
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["limit"] == 20


# -------------------------
# Get One User
# -------------------------

def test_admin_get_user():
    token = get_admin_token()

    response = client.get(
        "/api/v1/admin/users/8",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == 8
    assert "password" not in data
    assert "password_hash" not in data


# -------------------------
# Role Filter
# -------------------------

def test_admin_role_filter():
    token = get_admin_token()

    response = client.get(
        "/api/v1/admin/users?role=MODERATOR",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True

    for user in data["data"]:
        assert user["role"] == "MODERATOR"


# -------------------------
# Non-Admin Cannot Access
# -------------------------

def test_non_admin_cannot_access_admin_users():
    unique_id = uuid4().hex[:8]

    username = f"nonadmin_{unique_id}"
    email = f"nonadmin_{unique_id}@example.com"
    password = "TestPassword123!"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Non Admin Test User",
            "username": username,
            "email": email,
            "password": password,
        },
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/admin/users",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 403