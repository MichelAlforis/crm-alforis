"""
RGPD Celery Tasks - Automatic Data Anonymization

Tasks for RGPD compliance:
- Automatic anonymization of inactive users (2 years)
- Cleanup of old access logs (3 years retention)
- Regular compliance audits
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from database import SessionLocal
from models.data_access_log import DataAccessLog
from models.user import User
from services.rgpd_service import RGPDService
from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.rgpd_tasks.anonymize_inactive_users", bind=True)
def anonymize_inactive_users(self, inactive_days: int = 730) -> dict:
    """
    Anonymize users who have been inactive for more than X days (default: 2 years).

    RGPD Compliance: Right to be forgotten (Article 17).
    Users are considered inactive if:
    - last_login is older than inactive_days AND
    - Account is not admin AND
    - Account is not already anonymized

    Args:
        inactive_days: Number of days of inactivity before anonymization (default: 730 = 2 years)

    Returns:
        dict: Summary of anonymization results
    """
    db: Session = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=inactive_days)

        # Find inactive users
        inactive_users = (
            db.query(User)
            .filter(
                and_(
                    or_(
                        User.last_login < cutoff_date,
                        User.last_login.is_(None),  # Never logged in
                    ),
                    User.created_at < cutoff_date,  # Account older than cutoff
                    User.is_active == True,  # Not already disabled
                    User.is_admin == False,  # Don't anonymize admins
                    ~User.email.like("%@anonymized.local"),  # Not already anonymized
                )
            )
            .all()
        )

        anonymized_count = 0
        failed_count = 0
        results = []

        for user in inactive_users:
            try:
                service = RGPDService(db)
                counts = service.anonymize_user_data(
                    user_id=user.id, reason=f"Automatic anonymization after {inactive_days} days inactivity"
                )

                results.append(
                    {
                        "user_id": user.id,
                        "email": user.email,
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                        "anonymized_records": counts,
                    }
                )

                anonymized_count += 1
                logger.info(f"Auto-anonymized user {user.id} ({user.email}) - inactive since {user.last_login}")

            except Exception as e:
                logger.error(f"Failed to anonymize user {user.id}: {e}", exc_info=True)
                failed_count += 1
                db.rollback()

        summary = {
            "task": "anonymize_inactive_users",
            "execution_date": datetime.utcnow().isoformat(),
            "inactive_days": inactive_days,
            "cutoff_date": cutoff_date.isoformat(),
            "found": len(inactive_users),
            "anonymized": anonymized_count,
            "failed": failed_count,
            "results": results[:10],  # Limit results to first 10
        }

        logger.info(
            f"Anonymization task completed: {anonymized_count} users anonymized, {failed_count} failed"
        )

        return summary

    except Exception as e:
        logger.error(f"Anonymization task failed: {e}", exc_info=True)
        return {
            "task": "anonymize_inactive_users",
            "execution_date": datetime.utcnow().isoformat(),
            "error": str(e),
            "success": False,
        }
    finally:
        db.close()


@celery_app.task(name="tasks.rgpd_tasks.cleanup_old_access_logs", bind=True)
def cleanup_old_access_logs(self, retention_days: int = 1095) -> dict:
    """
    Delete access logs older than retention period (default: 3 years).

    CNIL Compliance: Access logs must be retained for at least 3 years.
    After 3 years, they can be safely deleted to minimize data storage.

    Args:
        retention_days: Number of days to retain logs (default: 1095 = 3 years)

    Returns:
        dict: Summary of cleanup results
    """
    db: Session = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        # Count logs to delete
        old_logs_count = (
            db.query(func.count(DataAccessLog.id))
            .filter(DataAccessLog.accessed_at < cutoff_date)
            .scalar()
        )

        if old_logs_count == 0:
            logger.info("No old access logs to cleanup")
            return {
                "task": "cleanup_old_access_logs",
                "execution_date": datetime.utcnow().isoformat(),
                "cutoff_date": cutoff_date.isoformat(),
                "deleted": 0,
            }

        # Delete old logs
        deleted = (
            db.query(DataAccessLog).filter(DataAccessLog.accessed_at < cutoff_date).delete(
                synchronize_session=False
            )
        )

        db.commit()

        logger.info(f"Deleted {deleted} access logs older than {retention_days} days")

        return {
            "task": "cleanup_old_access_logs",
            "execution_date": datetime.utcnow().isoformat(),
            "retention_days": retention_days,
            "cutoff_date": cutoff_date.isoformat(),
            "deleted": deleted,
        }

    except Exception as e:
        logger.error(f"Cleanup task failed: {e}", exc_info=True)
        db.rollback()
        return {
            "task": "cleanup_old_access_logs",
            "execution_date": datetime.utcnow().isoformat(),
            "error": str(e),
            "success": False,
        }
    finally:
        db.close()


@celery_app.task(name="tasks.rgpd_tasks.generate_compliance_report", bind=True)
def generate_compliance_report(self) -> dict:
    """
    Generate a compliance audit report.

    Provides statistics for RGPD compliance monitoring:
    - Total users
    - Active vs inactive users
    - Recent access logs
    - Anonymized accounts

    Returns:
        dict: Compliance report with statistics
    """
    db: Session = SessionLocal()
    try:
        # User statistics
        total_users = db.query(func.count(User.id)).scalar()
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
        anonymized_users = (
            db.query(func.count(User.id))
            .filter(User.email.like("%@anonymized.local"))
            .scalar()
        )

        # Access log statistics (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_access_logs = (
            db.query(func.count(DataAccessLog.id))
            .filter(DataAccessLog.accessed_at >= thirty_days_ago)
            .scalar()
        )

        # Access logs by type (last 30 days)
        access_by_type = (
            db.query(DataAccessLog.access_type, func.count(DataAccessLog.id))
            .filter(DataAccessLog.accessed_at >= thirty_days_ago)
            .group_by(DataAccessLog.access_type)
            .all()
        )

        # Inactive users (> 1 year)
        one_year_ago = datetime.utcnow() - timedelta(days=365)
        inactive_users = (
            db.query(func.count(User.id))
            .filter(
                or_(
                    User.last_login < one_year_ago,
                    User.last_login.is_(None),
                ),
                User.is_active == True,
                ~User.email.like("%@anonymized.local"),
            )
            .scalar()
        )

        report = {
            "task": "generate_compliance_report",
            "generation_date": datetime.utcnow().isoformat(),
            "users": {
                "total": total_users,
                "active": active_users,
                "inactive_1year": inactive_users,
                "anonymized": anonymized_users,
            },
            "access_logs": {
                "last_30_days": recent_access_logs,
                "by_type": {access_type: count for access_type, count in access_by_type},
            },
        }

        logger.info(f"Generated compliance report: {report}")
        return report

    except Exception as e:
        logger.error(f"Compliance report generation failed: {e}", exc_info=True)
        return {
            "task": "generate_compliance_report",
            "generation_date": datetime.utcnow().isoformat(),
            "error": str(e),
            "success": False,
        }
    finally:
        db.close()
