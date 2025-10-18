from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from core.config import settings
from models.base import Base
import logging

logger = logging.getLogger(__name__)

# Engine avec NullPool pour éviter les problèmes de connexion
engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    poolclass=NullPool,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db() -> Session:
    """
    Dependency pour FastAPI - fournit une session DB pour chaque requête
    
    Usage:
        def my_endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    """Initialiser les tables - à appeler au démarrage"""
    from models import base  # Import pour la métaclasse
    base.Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")

def drop_db():
    """Supprimer toutes les tables - À utiliser avec prudence!"""
    from models import base
    base.Base.metadata.drop_all(bind=engine)
    logger.warning("Database tables dropped!")

def health_check():
    """Vérifier la connexion à la BD"""
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
