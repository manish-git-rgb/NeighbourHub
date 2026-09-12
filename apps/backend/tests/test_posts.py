from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def create_user_and_token():
    unique_id = uuid4().hex[:8]

    user = {
        "name": "Post Test User",
        "username": f"post_test_{unique_id}",
        "email": f"post_test_{unique_id}@example.com",
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


def create_post(token):
    response = client.post(
        "/api/v1/posts/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "category": "DISCUSSION",
            "title": "Automated Test Post",
            "content": "Testing NeighborHub posts.",
            "visibility": "NEIGHBORHOOD",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert response.status_code == 201

    return response.json()


def test_create_post():
    token = create_user_and_token()

    post = create_post(token)

    assert post["title"] == "Automated Test Post"
    assert post["content"] == "Testing NeighborHub posts."
    assert post["user_id"] > 0


def test_list_posts():
    response = client.get(
        "/api/v1/posts/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "pagination" in data


def test_get_post():
    token = create_user_and_token()
    post = create_post(token)

    response = client.get(
        f"/api/v1/posts/{post['id']}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == post["id"]


def test_update_post():
    token = create_user_and_token()
    post = create_post(token)

    response = client.patch(
        f"/api/v1/posts/{post['id']}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "category": "DISCUSSION",
            "title": "Updated Automated Test Post",
            "content": "Updated content.",
            "visibility": "PUBLIC",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Automated Test Post"


def test_nearby_posts():
    response = client.get(
        "/api/v1/posts/nearby",
        params={
            "latitude": 18.5074,
            "longitude": 73.8077,
            "radius_km": 5,
        },
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_delete_post():
    token = create_user_and_token()
    post = create_post(token)

    response = client.delete(
        f"/api/v1/posts/{post['id']}",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 204