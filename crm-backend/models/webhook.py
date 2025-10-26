"""
Models - Webhook

Table stockant les webhooks sortants configurés par les intégrations externes.
"""

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON


def _json_column():
    try:
        from sqlalchemy import JSON
        return JSON
    except ImportError:
        return SQLITE_JSON

from models.base import BaseModel


class Webhook(BaseModel):
    """
    Représente un webhook sortant.

    Champs principaux:
    - url: Endpoint HTTP à invoquer
    - events: Liste des événements (EventType.value) auxquels le webhook est abonné
    - secret: Clé secrète utilisée pour signer les requêtes (HMAC SHA-256)
    - is_active: Permet de désactiver temporairement le webhook sans suppression
    - description: Informations facultatives affichées dans l'interface
    """

    __tablename__ = "webhooks"

    url = Column(String(500), nullable=False)
    events = Column(_json_column(), nullable=False, default=list)
    secret = Column(String(128), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)
