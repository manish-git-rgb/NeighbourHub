from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def create_user_and_token():
    unique_id = uuid4().hex[:8]

    user = {
        "name": "Reaction Test User",
        "username": f"reaction_test_{unique_id}",
        "email": f"reaction_test_{unique_id}@example.com",
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
            "title": "Reaction Test Post",
            "content": "Post for reaction testing.",
            "visibility": "PUBLIC",
            "latitude": 18.5074,
            "longitude": 73.8077,
        },
    )

    assert response.status_code == 201

    return response.json()["id"]


def create_reaction(token, post_id):
    response = client.post(
        "/api/v1/reactions/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "post_id": post_id,
            "reaction_type": "LIKE",
        },
    )

    assert response.status_code == 201

    return response.json()


def test_create_reaction():
    token = create_user_and_token()
    post_id = create_post(token)

    reaction = create_reaction(
        token,
        post_id,
    )

    assert reaction["post_id"] == post_id
    assert reaction["reaction_type"] == "LIKE"


def test_list_reactions():
    token = create_user_and_token()
    post_id = create_post(token)

    create_reaction(
        token,
        post_id,
    )

    response = client.get(
        "/api/v1/reactions/",
        params={
            "post_id": post_id
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)


def test_duplicate_reaction():
    token = create_user_and_token()
    post_id = create_post(token)

    create_reaction(
        token,
        post_id,
    )

    response = client.post(
        "/api/v1/reactions/",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "post_id": post_id,
            "reaction_type": "LIKE",
        },
    )

    assert response.status_code == 409


def test_delete_reaction():
    token = create_user_and_token()
    post_id = create_post(token)

    reaction = create_reaction(
        token,
        post_id,
    )

    response = client.delete(
        f"/api/v1/reactions/{reaction['id']}",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 204