from datetime import datetime, timedelta, timezone
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
        "name": "Event Test User",
        "username": f"event_test_{unique_id}",
        "email": f"event_test_{unique_id}@example.com",
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


def create_event(token):
    start_time = (
        datetime.now(timezone.utc)
        + timedelta(days=7)
    )
    end_time = start_time + timedelta(hours=2)

    response = client.post(
        "/api/v1/events/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "title": "Automated Test Event",
            "description": "Event created by automated tests.",
            "location_name": "Kothrud Test Park",
            "latitude": 18.5074,
            "longitude": 73.8077,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        },
    )

    assert response.status_code == 201

    return response.json()


# -------------------------
# Create Event
# -------------------------

def test_create_event():
    token = create_user()

    event = create_event(token)

    assert event["title"] == "Automated Test Event"
    assert event["user_id"] > 0
    assert event["status"] == "ACTIVE"


# -------------------------
# List Events
# -------------------------

def test_list_events():
    response = client.get(
        "/api/v1/events/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "pagination" in data


# -------------------------
# Get Event
# -------------------------

def test_get_event():
    token = create_user()
    event = create_event(token)

    response = client.get(
        f"/api/v1/events/{event['id']}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == event["id"]


# -------------------------
# Nearby Events
# -------------------------

def test_nearby_events():
    response = client.get(
        "/api/v1/events/nearby",
        params={
            "latitude": 18.5074,
            "longitude": 73.8077,
            "radius_km": 5,
        },
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


# -------------------------
# RSVP + Notification
# -------------------------

def test_event_rsvp_creates_notification():
    owner_token = create_user()
    attendee_token = create_user()

    event = create_event(owner_token)

    rsvp_response = client.post(
        f"/api/v1/events/{event['id']}/rsvp",
        headers={
            "Authorization": f"Bearer {attendee_token}"
        },
    )

    assert rsvp_response.status_code == 201

    notification_response = client.get(
        "/api/v1/notifications/",
        headers={
            "Authorization": f"Bearer {owner_token}"
        },
    )

    assert notification_response.status_code == 200

    notifications = notification_response.json()

    assert notifications["success"] is True

    matching_notifications = [
        notification
        for notification in notifications["data"]
        if notification["type"] == "EVENT_RSVP"
    ]

    assert matching_notifications


# -------------------------
# Cancel RSVP
# -------------------------

def test_cancel_rsvp():
    owner_token = create_user()
    attendee_token = create_user()

    event = create_event(owner_token)

    rsvp_response = client.post(
        f"/api/v1/events/{event['id']}/rsvp",
        headers={
            "Authorization": f"Bearer {attendee_token}"
        },
    )

    assert rsvp_response.status_code == 201

    cancel_response = client.delete(
        f"/api/v1/events/{event['id']}/rsvp",
        headers={
            "Authorization": f"Bearer {attendee_token}"
        },
    )

    assert cancel_response.status_code == 204