from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def create_user_and_token():
    unique_id = uuid4().hex[:8]

    user = {
        "name": "Comment Test User",
        "username": f"comment_test_{unique_id}",
        "email": f"comment_test_{unique_id}@example.com",
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
            "title": "Comment Test Post",
            "content": "Post for comment testing.",
            "visibility": "PUBLIC",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert response.status_code == 201

    return response.json()["id"]


def create_comment(token, post_id):
    response = client.post(
        "/api/v1/comments/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "post_id": post_id,
            "content": "Automated test comment.",
        },
    )

    assert response.status_code == 201

    return response.json()


def test_create_comment():
    token = create_user_and_token()
    post_id = create_post(token)

    comment = create_comment(
        token,
        post_id,
    )

    assert comment["post_id"] == post_id
    assert comment["content"] == "Automated test comment."


def test_list_comments():
    token = create_user_and_token()
    post_id = create_post(token)

    create_comment(
        token,
        post_id,
    )

    response = client.get(
        "/api/v1/comments/",
        params={
            "post_id": post_id
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)


def test_get_comment():
    token = create_user_and_token()
    post_id = create_post(token)

    comment = create_comment(
        token,
        post_id,
    )

    response = client.get(
        f"/api/v1/comments/{comment['id']}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == comment["id"]


def test_update_comment():
    token = create_user_and_token()
    post_id = create_post(token)

    comment = create_comment(
        token,
        post_id,
    )

    response = client.patch(
        f"/api/v1/comments/{comment['id']}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "content": "Updated test comment."
        },
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Updated test comment."


def test_delete_comment():
    token = create_user_and_token()
    post_id = create_post(token)

    comment = create_comment(
        token,
        post_id,
    )

    response = client.delete(
        f"/api/v1/comments/{comment['id']}",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 204