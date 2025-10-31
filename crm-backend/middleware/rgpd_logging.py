"""
RGPD Data Access Logging Middleware

Automatically logs all access to personal data endpoints.
Compliant with CNIL requirements for data access traceability.
"""

import json
import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from database import SessionLocal
from models.data_access_log import DataAccessLog

logger = logging.getLogger(__name__)

# Sensitive variables to mask in logs
SENSITIVE_ENV_VARS = {
    "DATABASE_URL",
    "REDIS_URL",
    "SECRET_KEY",
    "JWT_SECRET",
    "OPENAI_API_KEY",
    "MISTRAL_API_KEY",
    "GMAIL_CLIENT_SECRET",
    "OUTLOOK_CLIENT_SECRET",
    "SENTRY_DSN",
}


def mask_sensitive_value(value: str) -> str:
    """
    Mask sensitive values in logs.
    Shows first 4 chars + *** + last 4 chars
    """
    if not value or len(value) < 12:
        return "***"
    return f"{value[:4]}***{value[-4:]}"


def extract_entity_from_path(path: str) -> tuple[Optional[str], Optional[int]]:
    """
    Extract entity type and ID from API path.

    Examples:
    - /api/v1/people/123 → ("person", 123)
    - /api/v1/organisations/456 → ("organisation", 456)
    - /api/v1/users/789 → ("user", 789)
    - /api/v1/email/messages/321 → ("email_message", 321)
    """
    # Pattern: /api/v1/{entity}/{id}
    patterns = [
        (r"/api/v1/people/(\d+)", "person"),
        (r"/api/v1/organisations/(\d+)", "organisation"),
        (r"/api/v1/users/(\d+)", "user"),
        (r"/api/v1/email/messages/(\d+)", "email_message"),
        (r"/api/v1/interactions/(\d+)", "interaction"),
        (r"/api/v1/tasks/(\d+)", "task"),
    ]

    for pattern, entity_type in patterns:
        match = re.search(pattern, path)
        if match:
            entity_id = int(match.group(1))
            return entity_type, entity_id

    return None, None


def get_access_type(method: str, path: str) -> Optional[str]:
    """
    Determine access type based on HTTP method and path.

    Returns: "read", "export", "delete", "anonymize", or None
    """
    if method == "GET":
        if "/export" in path:
            return "export"
        return "read"
    elif method == "DELETE":
        if "/anonymize" in path:
            return "anonymize"
        return "delete"
    return None


class RGPDLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all access to personal data endpoints.

    Automatically creates DataAccessLog entries for:
    - GET requests to sensitive entities (people, organisations, users, etc.)
    - DELETE requests (anonymization/deletion)
    - Export requests
    """

    async def dispatch(self, request: Request, call_next):
        # Process request
        response = await call_next(request)

        # Only log successful requests (2xx status codes)
        if 200 <= response.status_code < 300:
            # Extract entity info from path
            entity_type, entity_id = extract_entity_from_path(request.url.path)

            # Determine access type
            access_type = get_access_type(request.method, request.url.path)

            # Only log if we have entity info and it's a tracked access type
            if entity_type and entity_id and access_type:
                # Get user info from request state (set by auth middleware)
                user_id = getattr(request.state, "user_id", None)

                # Get client IP
                ip_address = None
                if request.client:
                    ip_address = request.client.host
                # Check for X-Forwarded-For header (proxy/load balancer)
                if "x-forwarded-for" in request.headers:
                    ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()

                # Get User-Agent
                user_agent = request.headers.get("user-agent", "")

                # Determine purpose based on endpoint
                purpose = self._get_purpose(access_type, entity_type, request.url.path)

                # Create log entry
                try:
                    db: Session = SessionLocal()
                    try:
                        log_entry = DataAccessLog(
                            entity_type=entity_type,
                            entity_id=entity_id,
                            access_type=access_type,
                            endpoint=request.url.path,
                            purpose=purpose,
                            user_id=user_id,
                            ip_address=ip_address,
                            user_agent=user_agent[:500] if user_agent else None,
                            extra_data=json.dumps(
                                {"method": request.method, "query_params": dict(request.query_params)}
                            ),
                            accessed_at=datetime.utcnow(),
                        )
                        db.add(log_entry)
                        db.commit()

                        logger.debug(
                            f"RGPD Access logged: {access_type} {entity_type}:{entity_id} by user:{user_id}"
                        )
                    finally:
                        db.close()
                except Exception as e:
                    # Never fail the request due to logging errors
                    logger.error(f"Failed to create RGPD access log: {e}", exc_info=True)

        return response

    def _get_purpose(self, access_type: str, entity_type: str, path: str) -> str:
        """
        Generate purpose description based on access type and context.
        """
        if access_type == "read":
            return f"Consultation {entity_type}"
        elif access_type == "export":
            return f"Export RGPD {entity_type}"
        elif access_type == "delete":
            return f"Suppression {entity_type}"
        elif access_type == "anonymize":
            return f"Anonymisation RGPD {entity_type}"
        return f"Accès {entity_type}"
