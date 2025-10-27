import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from core.config import settings
from models.base import Base

logger = logging.getLogger(__name__)

# Engine avec QueuePool pour performance optimale (P0 optimization)
# SQLite: NullPool (thread safety)
# PostgreSQL: QueuePool avec pool_size=20, max_overflow=40
is_sqlite = "sqlite" in settings.database_url

engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    poolclass=NullPool if is_sqlite else QueuePool,
    pool_size=20 if not is_sqlite else None,
    max_overflow=40 if not is_sqlite else None,
    pool_pre_ping=True if not is_sqlite else None,
    pool_recycle=3600 if not is_sqlite else None,  # Recycle connections after 1h
    connect_args={"check_same_thread": False} if is_sqlite else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
