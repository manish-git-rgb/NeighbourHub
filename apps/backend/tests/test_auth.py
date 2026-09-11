from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_register():
    unique_id = uuid4().hex[:8]

    payload = {
        "name": "Pytest User",
        "username": f"pytest_{unique_id}",
        "email": f"pytest_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    response = client.post(
        "/api/v1/auth/register",
        json=payload,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["username"] == payload["username"]
    assert data["email"] == payload["email"]
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email():
    unique_id = uuid4().hex[:8]

    payload = {
        "name": "Duplicate Test User",
        "username": f"duplicate_{unique_id}",
        "email": f"duplicate_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    first_response = client.post(
        "/api/v1/auth/register",
        json=payload,
    )

    assert first_response.status_code == 201

    second_response = client.post(
        "/api/v1/auth/register",
        json=payload,
    )

    assert second_response.status_code in {400, 409}


def test_login_invalid_credentials():
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "does-not-exist@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_login():
    unique_id = uuid4().hex[:8]

    register_payload = {
        "name": "Login Test User",
        "username": f"login_{unique_id}",
        "email": f"login_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload,
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )

    assert login_response.status_code == 200

    data = login_response.json()

    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["refresh_token"]


def test_refresh_token():
    unique_id = uuid4().hex[:8]

    register_payload = {
        "name": "Refresh Test User",
        "username": f"refresh_{unique_id}",
        "email": f"refresh_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload,
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )

    assert login_response.status_code == 200

    original_tokens = login_response.json()

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": original_tokens["refresh_token"],
        },
    )

    assert refresh_response.status_code == 200

    new_tokens = refresh_response.json()

    assert new_tokens["token_type"] == "bearer"
    assert new_tokens["access_token"]
    assert new_tokens["refresh_token"]

    assert (
        new_tokens["refresh_token"]
        != original_tokens["refresh_token"]
    )


def test_logout():
    unique_id = uuid4().hex[:8]

    register_payload = {
        "name": "Logout Test User",
        "username": f"logout_{unique_id}",
        "email": f"logout_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload,
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )

    assert login_response.status_code == 200

    refresh_token = login_response.json()["refresh_token"]

    logout_response = client.post(
        "/api/v1/auth/logout",
        json={
            "refresh_token": refresh_token,
        },
    )

    assert logout_response.status_code == 200
    assert (
        logout_response.json()["message"]
        == "Logged out successfully"
    )

    # The same refresh token should now be unusable.
    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": refresh_token,
        },
    )

    assert refresh_response.status_code == 401