from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# -------------------------
# Helper
# -------------------------

def create_user():
    unique_id = uuid4().hex[:8]

    user = {
        "name": "Notification Test User",
        "username": f"notification_{unique_id}",
        "email": f"notification_{unique_id}@example.com",
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

    return login_response.json()["access_token"]


# -------------------------
# Notifications Require Auth
# -------------------------

def test_notifications_require_authentication():
    response = client.get(
        "/api/v1/notifications/"
    )

    assert response.status_code in {401, 403}


# -------------------------
# Notification List
# -------------------------

def test_list_notifications():
    token = create_user()

    response = client.get(
        "/api/v1/notifications/",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "pagination" in data


# -------------------------
# Read Notification
# -------------------------

def test_mark_notification_as_read():
    token = create_user()

    # Create a notification through an existing
    # application flow: comment on a user's post.
    post_response = client.post(
        "/api/v1/posts/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "category": "DISCUSSION",
            "title": "Notification Test Post",
            "content": "Post for notification testing.",
            "visibility": "PUBLIC",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert post_response.status_code == 201

    post_id = post_response.json()["id"]

    other_token = create_user()

    comment_response = client.post(
        "/api/v1/comments/",
        headers={
            "Authorization": f"Bearer {other_token}"
        },
        json={
            "post_id": post_id,
            "content": "Notification test comment.",
        },
    )

    assert comment_response.status_code == 201

    notification_response = client.get(
        "/api/v1/notifications/",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert notification_response.status_code == 200

    notifications = notification_response.json()["data"]

    matching = [
        notification
        for notification in notifications
        if notification["type"] == "COMMENT"
    ]

    assert matching

    notification_id = matching[0]["id"]

    read_response = client.patch(
        f"/api/v1/notifications/{notification_id}/read",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert read_response.status_code == 200

    data = read_response.json()

    assert data["id"] == notification_id
    assert data["is_read"] is True


# -------------------------
# Read Filter
# -------------------------

def test_notification_read_filter():
    token = create_user()

    response = client.get(
        "/api/v1/notifications/",
        params={
            "is_read": False
        },
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True

    for notification in data["data"]:
        assert notification["is_read"] is False


# -------------------------
# Delete Notification
# -------------------------

def test_delete_notification():
    token = create_user()

    post_response = client.post(
        "/api/v1/posts/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "category": "DISCUSSION",
            "title": "Delete Notification Test",
            "content": "Post for notification deletion test.",
            "visibility": "PUBLIC",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert post_response.status_code == 201

    post_id = post_response.json()["id"]

    other_token = create_user()

    comment_response = client.post(
        "/api/v1/comments/",
        headers={
            "Authorization": f"Bearer {other_token}"
        },
        json={
            "post_id": post_id,
            "content": "Create notification for deletion.",
        },
    )

    assert comment_response.status_code == 201

    notifications_response = client.get(
        "/api/v1/notifications/",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert notifications_response.status_code == 200

    notifications = notifications_response.json()["data"]

    matching = [
        notification
        for notification in notifications
        if notification["type"] == "COMMENT"
    ]

    assert matching

    notification_id = matching[0]["id"]

    delete_response = client.delete(
        f"/api/v1/notifications/{notification_id}",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert delete_response.status_code == 204