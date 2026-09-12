from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# -------------------------
# Helpers
# -------------------------

def create_user():
    unique_id = uuid4().hex[:8]

    user = {
        "name": "Issue Test User",
        "username": f"issue_test_{unique_id}",
        "email": f"issue_test_{unique_id}@example.com",
        "password": "TestPassword123!",
    }

    response = client.post(
        "/api/v1/auth/register",
        json=user,
    )

    assert response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    assert login_response.status_code == 200

    return login_response.json()["access_token"]


def create_issue(token):
    response = client.post(
        "/api/v1/issues/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "title": "Automated Test Issue",
            "description": "Issue created by automated tests.",
            "category": "ROAD",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert response.status_code == 201

    return response.json()


# -------------------------
# Create Issue
# -------------------------

def test_create_issue():
    token = create_user()

    issue = create_issue(token)

    assert issue["title"] == "Automated Test Issue"
    assert issue["description"] == "Issue created by automated tests."
    assert issue["status"] == "OPEN"


# -------------------------
# List Issues
# -------------------------

def test_list_issues():
    response = client.get(
        "/api/v1/issues/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "pagination" in data


# -------------------------
# Nearby Issues
# -------------------------

def test_nearby_issues():
    response = client.get(
        "/api/v1/issues/nearby",
        params={
            "latitude": 18.5074,
            "longitude": 73.8077,
            "radius_km": 5,
        },
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


# -------------------------
# Issue Status Notification
# -------------------------

def test_issue_status_creates_notification():
    token = create_user()

    issue = create_issue(token)

    update_response = client.patch(
        f"/api/v1/issues/{issue['id']}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "status": "IN_PROGRESS"
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["status"] == "IN_PROGRESS"

    notification_response = client.get(
        "/api/v1/notifications/",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert notification_response.status_code == 200

    notifications = notification_response.json()

    assert notifications["success"] is True

    matching_notifications = [
        notification
        for notification in notifications["data"]
        if notification["type"] == "ISSUE_STATUS"
    ]

    assert matching_notifications