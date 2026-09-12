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
# Helpers
# -------------------------

def create_user():
    unique_id = uuid4().hex[:8]

    user = {
        "name": "Moderation Test User",
        "username": f"moderation_{unique_id}",
        "email": f"moderation_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    register_response = client.post(
        "/api/v1/auth/register",
        json=user,
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    assert login_response.status_code == 200

    return {
        "user": user,
        "token": login_response.json()["access_token"],
    }


def create_post(token):
    response = client.post(
        "/api/v1/posts/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "category": "DISCUSSION",
            "title": "Moderation Test Post",
            "content": "Post created for moderation testing.",
            "visibility": "PUBLIC",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert response.status_code == 201

    return response.json()


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


def create_moderation_case():
    reporter = create_user()
    post = create_post(reporter["token"])

    response = client.post(
        "/api/v1/moderation/",
        headers={
            "Authorization": f"Bearer {reporter['token']}"
        },
        json={
            "post_id": post["id"],
            "reason": "SPAM",
            "description": "Automated moderation test.",
        },
    )

    assert response.status_code == 201

    return reporter, post, response.json()


# -------------------------
# Create Moderation Case
# -------------------------

def test_create_moderation_case():
    reporter, post, moderation_case = (
        create_moderation_case()
    )

    assert moderation_case["reporter_id"] > 0
    assert moderation_case["post_id"] == post["id"]
    assert moderation_case["comment_id"] is None
    assert moderation_case["status"] == "OPEN"


# -------------------------
# Normal User Cannot List Cases
# -------------------------

def test_normal_user_cannot_list_moderation_cases():
    user = create_user()

    response = client.get(
        "/api/v1/moderation/",
        headers={
            "Authorization": f"Bearer {user['token']}"
        },
    )

    assert response.status_code == 403


# -------------------------
# Admin Can List Cases
# -------------------------

def test_admin_can_list_moderation_cases():
    admin_token = get_admin_token()

    response = client.get(
        "/api/v1/moderation/",
        headers={
            "Authorization": f"Bearer {admin_token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "pagination" in data


# -------------------------
# Admin Updates Moderation
# -------------------------

def test_admin_updates_moderation_case():
    _, _, moderation_case = (
        create_moderation_case()
    )

    admin_token = get_admin_token()

    response = client.patch(
        f"/api/v1/moderation/{moderation_case['id']}",
        headers={
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "status": "UNDER_REVIEW"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == moderation_case["id"]
    assert data["status"] == "UNDER_REVIEW"


# -------------------------
# Moderation Update Creates Notification
# -------------------------

def test_moderation_update_creates_notification():
    reporter, _, moderation_case = (
        create_moderation_case()
    )

    admin_token = get_admin_token()

    update_response = client.patch(
        f"/api/v1/moderation/{moderation_case['id']}",
        headers={
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "status": "RESOLVED"
        },
    )

    assert update_response.status_code == 200

    notification_response = client.get(
        "/api/v1/notifications/",
        headers={
            "Authorization": f"Bearer {reporter['token']}"
        },
    )

    assert notification_response.status_code == 200

    data = notification_response.json()

    assert data["success"] is True

    matching_notifications = [
        notification
        for notification in data["data"]
        if notification["type"] == "MODERATION_STATUS"
    ]

    assert matching_notifications

    assert (
        matching_notifications[0]["title"]
        == "Moderation report updated"
    )