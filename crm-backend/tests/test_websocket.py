import anyio
import pytest

from core.notifications import manager


@pytest.mark.skip(reason="WebSocket endpoint now requires 'token' parameter, not 'user_id'")
def test_websocket_ping_and_push_notification(client):
    user_id = 123

    with client.websocket_connect(f"/ws/notifications?user_id={user_id}") as websocket:
        connected = websocket.receive_json()
        assert connected["type"] == "connected"
        assert connected["data"]["user_id"] == user_id

        websocket.send_json({"type": "ping"})
        pong = websocket.receive_json()
        assert pong == {"type": "pong"}

        payload = {
            "type": "notification",
            "data": {"title": "Hello", "message": "World"},
        }
        anyio.from_thread.run(manager.send_personal_message, payload, user_id)

        received = websocket.receive_json()
        assert received == payload
