from core.security import decode_token


def test_login_returns_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@tpmfinance.com", "password": "admin123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert "access_token" in data

    payload = decode_token(data["access_token"])
    assert payload["email"] == "admin@tpmfinance.com"
    assert payload["is_admin"] is True


def test_login_rejects_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@tpmfinance.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_me_endpoint_returns_user_info(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "user@tpmfinance.com", "password": "user123"},
    )
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data == {"email": "user@tpmfinance.com", "is_admin": False}


def test_refresh_endpoint_returns_new_token(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@tpmfinance.com", "password": "admin123"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/auth/refresh",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert "access_token" in data

    refreshed_payload = decode_token(data["access_token"])
    assert refreshed_payload["email"] == "admin@tpmfinance.com"
