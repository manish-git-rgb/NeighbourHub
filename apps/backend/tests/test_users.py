from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def create_test_user():
    unique_id = uuid4().hex[:8]

    payload = {
        "name": "User Test",
        "username": f"user_test_{unique_id}",
        "email": f"user_test_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    response = client.post(
        "/api/v1/auth/register",
        json=payload,
    )

    assert response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": payload["email"],
            "password": payload["password"],
        },
    )

    assert login_response.status_code == 200

    return {
        "payload": payload,
        "access_token": login_response.json()["access_token"],
    }


def test_get_current_user():
    user = create_test_user()

    response = client.get(
        "/api/v1/users/me",
        headers={
            "Authorization": f"Bearer {user['access_token']}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["username"] == user["payload"]["username"]
    assert data["email"] == user["payload"]["email"]
    assert "password" not in data
    assert "password_hash" not in data


def test_update_current_user():
    user = create_test_user()

    response = client.patch(
        "/api/v1/users/me",
        headers={
            "Authorization": f"Bearer {user['access_token']}"
        },
        json={
            "bio": "Automated test profile"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["bio"] == "Automated test profile"


def test_get_current_user_neighborhoods():
    user = create_test_user()

    response = client.get(
        "/api/v1/users/me/neighborhoods",
        headers={
            "Authorization": f"Bearer {user['access_token']}"
        },
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_users_require_authentication():
    response = client.get(
        "/api/v1/users/me"
    )

    assert response.status_code in {401, 403}