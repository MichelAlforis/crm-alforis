#!/usr/bin/env python3
"""
Script de maintenance DB - Nettoyage automatique

Fonctionnalités:
1. Purge logs anciens (> 90 jours)
2. Nettoyage sessions expirées
3. Purge notifications lues (> 30 jours)
4. VACUUM PostgreSQL
5. Statistiques de nettoyage

Usage:
    # Dry-run (simulation)
    python scripts/db_maintenance.py --dry-run

    # Exécution réelle
    python scripts/db_maintenance.py --execute

    # Avec paramètres personnalisés
    python scripts/db_maintenance.py --execute --logs-days 60 --notifications-days 14

Cron (quotidien 3AM):
    0 3 * * * cd /app && python scripts/db_maintenance.py --execute >> /var/log/crm/maintenance.log 2>&1
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ajouter le répertoire parent au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

import argparse
import logging

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.audit_log import AuditLog

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# Configuration par défaut
# ============================================================================

DEFAULT_LOGS_RETENTION_DAYS = 90
DEFAULT_NOTIFICATIONS_RETENTION_DAYS = 30
DEFAULT_SESSIONS_RETENTION_DAYS = 7


# ============================================================================
# Fonctions de nettoyage
# ============================================================================

def cleanup_old_audit_logs(
    db: Session,
    retention_days: int,
    dry_run: bool = True
) -> int:
    """
    Purge les audit logs anciens

    Args:
        db: Session SQLAlchemy
        retention_days: Nombre de jours à conserver
        dry_run: Si True, simule sans supprimer

    Returns:
        Nombre de lignes supprimées
    """
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

    # Compter
    count = (
        db.query(AuditLog)
        .filter(AuditLog.created_at < cutoff_date)
        .count()
    )

    logger.info(f"{'[DRY-RUN] ' if dry_run else ''}Audit logs à supprimer: {count} (avant {cutoff_date.date()})")

    if not dry_run and count > 0:
        # Supprimer par batch de 1000 pour éviter de bloquer la DB
        deleted = 0
        batch_size = 1000

        while True:
            result = db.execute(
                text("""
                    DELETE FROM audit_logs
                    WHERE id IN (
                        SELECT id FROM audit_logs
                        WHERE created_at < :cutoff
                        LIMIT :batch_size
                    )
                """),
                {"cutoff": cutoff_date, "batch_size": batch_size}
            )
            db.commit()

            batch_deleted = result.rowcount
            deleted += batch_deleted

            if batch_deleted == 0:
                break

            logger.info(f"  Supprimé: {deleted}/{count} audit logs...")

        logger.info(f"✅ Audit logs supprimés: {deleted}")

    return count


def cleanup_expired_sessions(
    db: Session,
    retention_days: int,
    dry_run: bool = True
) -> int:
    """
    Purge les sessions expirées

    Args:
        db: Session SQLAlchemy
        retention_days: Nombre de jours à conserver
        dry_run: Si True, simule sans supprimer

    Returns:
        Nombre de sessions supprimées
    """
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

    # Vérifier si la table sessions existe
    result = db.execute(
        text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions')")
    )
    table_exists = result.scalar()

    if not table_exists:
        logger.info("Table 'sessions' n'existe pas, skip")
        return 0

    # Compter
    count_result = db.execute(
        text("SELECT COUNT(*) FROM sessions WHERE updated_at < :cutoff OR expires_at < NOW()"),
        {"cutoff": cutoff_date}
    )
    count = count_result.scalar()

    logger.info(f"{'[DRY-RUN] ' if dry_run else ''}Sessions expirées à supprimer: {count}")

    if not dry_run and count > 0:
        result = db.execute(
            text("DELETE FROM sessions WHERE updated_at < :cutoff OR expires_at < NOW()"),
            {"cutoff": cutoff_date}
        )
        db.commit()
        logger.info(f"✅ Sessions supprimées: {result.rowcount}")

    return count


def cleanup_old_notifications(
    db: Session,
    retention_days: int,
    dry_run: bool = True
) -> int:
    """
    Purge les notifications lues anciennes

    Args:
        db: Session SQLAlchemy
        retention_days: Nombre de jours à conserver
        dry_run: Si True, simule sans supprimer

    Returns:
        Nombre de notifications supprimées
    """
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

    # Vérifier si la table notifications existe
    result = db.execute(
        text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications')")
    )
    table_exists = result.scalar()

    if not table_exists:
        logger.info("Table 'notifications' n'existe pas, skip")
        return 0

    # Compter (seulement les notifications LUES)
    count_result = db.execute(
        text("SELECT COUNT(*) FROM notifications WHERE is_read = TRUE AND created_at < :cutoff"),
        {"cutoff": cutoff_date}
    )
    count = count_result.scalar()

    logger.info(f"{'[DRY-RUN] ' if dry_run else ''}Notifications lues à supprimer: {count} (avant {cutoff_date.date()})")

    if not dry_run and count > 0:
        result = db.execute(
            text("DELETE FROM notifications WHERE is_read = TRUE AND created_at < :cutoff"),
            {"cutoff": cutoff_date}
        )
        db.commit()
        logger.info(f"✅ Notifications supprimées: {result.rowcount}")

    return count


def vacuum_database(db: Session, dry_run: bool = True) -> None:
    """
    Optimise la DB avec VACUUM ANALYZE

    Args:
        db: Session SQLAlchemy
        dry_run: Si True, simule sans exécuter
    """
    if dry_run:
        logger.info("[DRY-RUN] VACUUM ANALYZE skippé en mode dry-run")
        return

    logger.info("Exécution de VACUUM ANALYZE...")

    # VACUUM ne peut pas s'exécuter dans une transaction
    db.commit()
    db.connection().connection.set_isolation_level(0)

    try:
        db.execute(text("VACUUM ANALYZE"))
        logger.info("✅ VACUUM ANALYZE terminé")
    except Exception as e:
        logger.error(f"❌ VACUUM ANALYZE échoué: {e}")
    finally:
        db.connection().connection.set_isolation_level(1)


def get_database_stats(db: Session) -> dict:
    """
    Récupère les statistiques de la DB

    Returns:
        Dict avec les stats
    """
    stats = {}

    # Taille totale DB
    result = db.execute(text("SELECT pg_database_size(current_database())"))
    stats['db_size_bytes'] = result.scalar()
    stats['db_size_mb'] = round(stats['db_size_bytes'] / 1024 / 1024, 2)

    # Nombre de tables
    result = db.execute(
        text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
    )
    stats['table_count'] = result.scalar()

    # Top 5 tables les plus grosses
    result = db.execute(text("""
        SELECT
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5
    """))
    stats['top_tables'] = [{"table": row[0], "size": row[1]} for row in result]

    return stats


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Script de maintenance DB')

    parser.add_argument(
        '--execute',
        action='store_true',
        help='Exécuter réellement (sinon dry-run par défaut)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Mode simulation (par défaut)'
    )

    parser.add_argument(
        '--logs-days',
        type=int,
        default=DEFAULT_LOGS_RETENTION_DAYS,
        help=f'Nombre de jours à conserver pour audit logs (défaut: {DEFAULT_LOGS_RETENTION_DAYS})'
    )

    parser.add_argument(
        '--notifications-days',
        type=int,
        default=DEFAULT_NOTIFICATIONS_RETENTION_DAYS,
        help=f'Nombre de jours à conserver pour notifications lues (défaut: {DEFAULT_NOTIFICATIONS_RETENTION_DAYS})'
    )

    parser.add_argument(
        '--sessions-days',
        type=int,
        default=DEFAULT_SESSIONS_RETENTION_DAYS,
        help=f'Nombre de jours à conserver pour sessions (défaut: {DEFAULT_SESSIONS_RETENTION_DAYS})'
    )

    parser.add_argument(
        '--skip-vacuum',
        action='store_true',
        help='Skip VACUUM ANALYZE (utile en dev)'
    )

    args = parser.parse_args()

    # Mode dry-run par défaut sauf si --execute
    dry_run = not args.execute

    logger.info("=" * 80)
    logger.info(f"🧹 MAINTENANCE DB - {'DRY-RUN' if dry_run else 'EXECUTION REELLE'}")
    logger.info("=" * 80)
    logger.info(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Rétention audit logs: {args.logs_days} jours")
    logger.info(f"Rétention notifications: {args.notifications_days} jours")
    logger.info(f"Rétention sessions: {args.sessions_days} jours")
    logger.info("")

    db = SessionLocal()

    try:
        # Stats AVANT
        logger.info("📊 Statistiques AVANT nettoyage:")
        stats_before = get_database_stats(db)
        logger.info(f"  Taille DB: {stats_before['db_size_mb']} MB")
        logger.info(f"  Nombre de tables: {stats_before['table_count']}")
        logger.info("  Top 5 tables:")
        for table in stats_before['top_tables']:
            logger.info(f"    - {table['table']}: {table['size']}")
        logger.info("")

        # Nettoyage
        total_deleted = 0

        logger.info("🗑️  Nettoyage en cours...")
        total_deleted += cleanup_old_audit_logs(db, args.logs_days, dry_run)
        total_deleted += cleanup_expired_sessions(db, args.sessions_days, dry_run)
        total_deleted += cleanup_old_notifications(db, args.notifications_days, dry_run)
        logger.info("")

        # VACUUM
        if not args.skip_vacuum:
            vacuum_database(db, dry_run)
            logger.info("")

        # Stats APRÈS
        logger.info("📊 Statistiques APRÈS nettoyage:")
        stats_after = get_database_stats(db)
        logger.info(f"  Taille DB: {stats_after['db_size_mb']} MB")

        if not dry_run:
            size_saved = stats_before['db_size_mb'] - stats_after['db_size_mb']
            logger.info(f"  Espace libéré: {size_saved} MB")

        logger.info("")
        logger.info("=" * 80)
        logger.info(f"✅ MAINTENANCE TERMINÉE - {total_deleted} lignes {'à supprimer' if dry_run else 'supprimées'}")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Erreur lors de la maintenance: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
