"""
Tests pour le monitoring système

Couvre:
- Endpoint /health (métriques complètes)
- Endpoint /metrics (métriques légères)
- Métriques système (CPU, RAM, disque)
- Métriques base de données (tâches 24h, notifications)
- Statut workers supervisord
- Récupération des erreurs récentes
- Gestion des erreurs et timeouts

Objectif: Augmenter la couverture de 20% → 80%
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from models.task import Task, TaskStatus
from models.notification import Notification


class TestMonitoringHealth:
    """Tests de l'endpoint /health (monitoring complet)"""

    @patch("api.routes.monitoring.get_system_metrics")
    @patch("api.routes.monitoring.get_database_metrics")
    @patch("api.routes.monitoring.get_supervisord_status")
    @patch("api.routes.monitoring.get_recent_errors")
    def test_health_endpoint_all_healthy(
        self,
        mock_errors,
        mock_workers,
        mock_db_metrics,
        mock_system,
        client,
        auth_headers,
    ):
        """Test /health avec tous les systèmes en bonne santé"""
        # Mock toutes les métriques comme healthy
        mock_system.return_value = {
            "cpu": {"percent": 45.2, "count": 4, "status": "healthy"},
            "memory": {"total_gb": 16.0, "used_gb": 8.0, "percent": 50.0, "status": "healthy"},
            "disk": {"total_gb": 500.0, "used_gb": 200.0, "percent": 40.0, "status": "healthy"},
        }
        mock_db_metrics.return_value = {
            "tasks_24h": {"total": 100, "completed": 95, "failed": 5, "success_rate": 95.0},
            "notifications": {"unread": 10},
            "status": "healthy",
        }
        mock_workers.return_value = {
            "workers": {"celery": {"status": "RUNNING", "healthy": True}},
            "status": "healthy",
        }
        mock_errors.return_value = []

        response = client.get("/api/v1/monitoring/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "system" in data
        assert "database" in data
        assert "workers" in data
        assert "errors" in data
        assert data["system"]["cpu"]["status"] == "healthy"

    @patch("api.routes.monitoring.get_system_metrics")
    @patch("api.routes.monitoring.get_database_metrics")
    @patch("api.routes.monitoring.get_supervisord_status")
    @patch("api.routes.monitoring.get_recent_errors")
    def test_health_endpoint_warning_cpu(
        self,
        mock_errors,
        mock_workers,
        mock_db_metrics,
        mock_system,
        client,
        auth_headers,
    ):
        """Test /health avec CPU en warning (>80%)"""
        mock_system.return_value = {
            "cpu": {"percent": 85.0, "count": 4, "status": "warning"},
            "memory": {"total_gb": 16.0, "used_gb": 8.0, "percent": 50.0, "status": "healthy"},
            "disk": {"total_gb": 500.0, "used_gb": 200.0, "percent": 40.0, "status": "healthy"},
        }
        mock_db_metrics.return_value = {"tasks_24h": {}, "status": "healthy"}
        mock_workers.return_value = {"workers": {}, "status": "healthy"}
        mock_errors.return_value = []

        response = client.get("/api/v1/monitoring/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "warning"
        assert data["system"]["cpu"]["status"] == "warning"

    @patch("api.routes.monitoring.get_system_metrics")
    @patch("api.routes.monitoring.get_database_metrics")
    @patch("api.routes.monitoring.get_supervisord_status")
    @patch("api.routes.monitoring.get_recent_errors")
    def test_health_endpoint_critical_memory(
        self,
        mock_errors,
        mock_workers,
        mock_db_metrics,
        mock_system,
        client,
        auth_headers,
    ):
        """Test /health avec mémoire critique (>95%)"""
        mock_system.return_value = {
            "cpu": {"percent": 45.0, "count": 4, "status": "healthy"},
            "memory": {"total_gb": 16.0, "used_gb": 15.5, "percent": 96.0, "status": "critical"},
            "disk": {"total_gb": 500.0, "used_gb": 200.0, "percent": 40.0, "status": "healthy"},
        }
        mock_db_metrics.return_value = {"tasks_24h": {}, "status": "healthy"}
        mock_workers.return_value = {"workers": {}, "status": "healthy"}
        mock_errors.return_value = []

        response = client.get("/api/v1/monitoring/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "critical"
        assert data["system"]["memory"]["status"] == "critical"

    @patch("api.routes.monitoring.get_system_metrics")
    @patch("api.routes.monitoring.get_database_metrics")
    @patch("api.routes.monitoring.get_supervisord_status")
    @patch("api.routes.monitoring.get_recent_errors")
    def test_health_endpoint_workers_degraded(
        self,
        mock_errors,
        mock_workers,
        mock_db_metrics,
        mock_system,
        client,
        auth_headers,
    ):
        """Test /health avec workers dégradés"""
        mock_system.return_value = {
            "cpu": {"percent": 45.0, "count": 4, "status": "healthy"},
            "memory": {"total_gb": 16.0, "used_gb": 8.0, "percent": 50.0, "status": "healthy"},
            "disk": {"total_gb": 500.0, "used_gb": 200.0, "percent": 40.0, "status": "healthy"},
        }
        mock_db_metrics.return_value = {"tasks_24h": {}, "status": "healthy"}
        mock_workers.return_value = {
            "workers": {
                "celery": {"status": "STOPPED", "healthy": False},
                "worker2": {"status": "RUNNING", "healthy": True},
            },
            "status": "degraded",
        }
        mock_errors.return_value = []

        response = client.get("/api/v1/monitoring/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "degraded"
        assert data["workers"]["status"] == "degraded"

    @patch("api.routes.monitoring.get_system_metrics")
    @patch("api.routes.monitoring.get_database_metrics")
    @patch("api.routes.monitoring.get_supervisord_status")
    @patch("api.routes.monitoring.get_recent_errors")
    def test_health_endpoint_with_errors(
        self,
        mock_errors,
        mock_workers,
        mock_db_metrics,
        mock_system,
        client,
        auth_headers,
    ):
        """Test /health avec erreurs récentes"""
        mock_system.return_value = {
            "cpu": {"percent": 45.0, "count": 4, "status": "healthy"},
            "memory": {"total_gb": 16.0, "used_gb": 8.0, "percent": 50.0, "status": "healthy"},
            "disk": {"total_gb": 500.0, "used_gb": 200.0, "percent": 40.0, "status": "healthy"},
        }
        mock_db_metrics.return_value = {"tasks_24h": {}, "status": "healthy"}
        mock_workers.return_value = {"workers": {}, "status": "healthy"}
        mock_errors.return_value = [
            {
                "timestamp": "2025-01-27T10:00:00Z",
                "type": "task_failed",
                "task_id": 123,
                "title": "Failed task",
            }
        ]

        response = client.get("/api/v1/monitoring/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert len(data["errors"]) == 1
        assert data["errors"][0]["type"] == "task_failed"



class TestMonitoringMetrics:
    """Tests de l'endpoint /metrics (métriques légères)"""

    @patch("psutil.cpu_percent")
    @patch("psutil.virtual_memory")
    @patch("psutil.disk_usage")
    def test_metrics_endpoint_success(
        self, mock_disk, mock_memory, mock_cpu, client, auth_headers
    ):
        """Test /metrics avec données valides"""
        # Mock psutil
        mock_cpu.return_value = 42.5
        mock_memory.return_value = Mock(percent=65.3)
        mock_disk.return_value = Mock(percent=55.8)

        response = client.get("/api/v1/monitoring/metrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert "cpu_percent" in data
        assert "memory_percent" in data
        assert "disk_percent" in data
        assert "timestamp" in data
        assert data["cpu_percent"] == 42.5
        assert data["memory_percent"] == 65.3
        assert data["disk_percent"] == 55.8

    @patch("psutil.cpu_percent")
    def test_metrics_endpoint_psutil_error(self, mock_cpu, client, auth_headers):
        """Test /metrics avec erreur psutil"""
        mock_cpu.side_effect = Exception("psutil error")

        response = client.get("/api/v1/monitoring/metrics", headers=auth_headers)
        assert response.status_code == 500
        assert "error" in response.json()["detail"].lower()



class TestSystemMetrics:
    """Tests de la fonction get_system_metrics()"""

    @patch("psutil.cpu_percent")
    @patch("psutil.cpu_count")
    @patch("psutil.virtual_memory")
    @patch("psutil.disk_usage")
    def test_get_system_metrics_healthy(self, mock_disk, mock_mem, mock_cpu_count, mock_cpu_pct):
        """Test get_system_metrics avec système sain"""
        from api.routes.monitoring import get_system_metrics

        # Mock tous les appels psutil
        mock_cpu_pct.return_value = 45.3
        mock_cpu_count.return_value = 8
        mock_mem.return_value = Mock(
            total=17179869184,  # 16 GB
            used=8589934592,  # 8 GB
            percent=50.0,
        )
        mock_disk.return_value = Mock(
            total=536870912000,  # 500 GB
            used=214748364800,  # 200 GB
            percent=40.0,
        )

        metrics = get_system_metrics()

        assert metrics["cpu"]["percent"] == 45.3
        assert metrics["cpu"]["count"] == 8
        assert metrics["cpu"]["status"] == "healthy"
        assert metrics["memory"]["percent"] == 50.0
        assert metrics["memory"]["status"] == "healthy"
        assert metrics["disk"]["percent"] == 40.0
        assert metrics["disk"]["status"] == "healthy"

    @patch("psutil.cpu_percent")
    @patch("psutil.cpu_count")
    @patch("psutil.virtual_memory")
    @patch("psutil.disk_usage")
    def test_get_system_metrics_warning(self, mock_disk, mock_mem, mock_cpu_count, mock_cpu_pct):
        """Test get_system_metrics avec warning (80-95%)"""
        from api.routes.monitoring import get_system_metrics

        mock_cpu_pct.return_value = 85.0
        mock_cpu_count.return_value = 4
        mock_mem.return_value = Mock(total=16000000000, used=14000000000, percent=87.5)
        mock_disk.return_value = Mock(total=500000000000, used=430000000000, percent=86.0)

        metrics = get_system_metrics()

        assert metrics["cpu"]["status"] == "warning"
        assert metrics["memory"]["status"] == "warning"
        assert metrics["disk"]["status"] == "warning"

    @patch("psutil.cpu_percent")
    @patch("psutil.cpu_count")
    @patch("psutil.virtual_memory")
    @patch("psutil.disk_usage")
    def test_get_system_metrics_critical(self, mock_disk, mock_mem, mock_cpu_count, mock_cpu_pct):
        """Test get_system_metrics avec critical (>95%)"""
        from api.routes.monitoring import get_system_metrics

        mock_cpu_pct.return_value = 98.0
        mock_cpu_count.return_value = 4
        mock_mem.return_value = Mock(total=16000000000, used=15500000000, percent=96.9)
        mock_disk.return_value = Mock(total=500000000000, used=485000000000, percent=97.0)

        metrics = get_system_metrics()

        assert metrics["cpu"]["status"] == "critical"
        assert metrics["memory"]["status"] == "critical"
        assert metrics["disk"]["status"] == "critical"

    @patch("psutil.cpu_percent")
    def test_get_system_metrics_error(self, mock_cpu):
        """Test get_system_metrics avec erreur psutil"""
        from api.routes.monitoring import get_system_metrics

        mock_cpu.side_effect = Exception("Hardware error")

        metrics = get_system_metrics()

        assert "error" in metrics
        assert "Failed to collect" in metrics["error"]


class TestDatabaseMetrics:
    """Tests de la fonction get_database_metrics()"""

    def test_get_database_metrics_with_tasks(self, test_db, test_user):
        """Test get_database_metrics avec tâches des 24h"""
        from api.routes.monitoring import get_database_metrics

        # Créer des tâches récentes
        now = datetime.now(timezone.utc)
        for i in range(10):
            task = Task(
                title=f"Task {i}",
                status=TaskStatus.DONE if i < 8 else TaskStatus.CANCELLED,
                created_by=test_user.id,
                created_at=now - timedelta(hours=12),
            )
            test_db.add(task)

        # Créer quelques notifications non lues
        for i in range(5):
            notif = Notification(
                user_id=test_user.id,
                type="info",
                title=f"Notification {i}",
                message="Test message",
                is_read=False,
            )
            test_db.add(notif)

        test_db.commit()

        metrics = get_database_metrics(test_db)

        assert metrics["tasks_24h"]["total"] == 10
        assert metrics["tasks_24h"]["completed"] == 8
        assert metrics["tasks_24h"]["failed"] == 2
        assert metrics["tasks_24h"]["success_rate"] == 80.0
        assert metrics["notifications"]["unread"] == 5
        assert metrics["status"] == "healthy"

    def test_get_database_metrics_high_failures(self, test_db, test_user):
        """Test get_database_metrics avec beaucoup d'échecs (>10)"""
        from api.routes.monitoring import get_database_metrics

        # Créer beaucoup de tâches échouées
        now = datetime.now(timezone.utc)
        for i in range(15):
            task = Task(
                title=f"Failed task {i}",
                status=TaskStatus.CANCELLED,
                created_by=test_user.id,
                created_at=now - timedelta(hours=6),
            )
            test_db.add(task)
        test_db.commit()

        metrics = get_database_metrics(test_db)

        assert metrics["tasks_24h"]["failed"] == 15
        assert metrics["status"] == "warning"

    def test_get_database_metrics_no_tasks(self, test_db):
        """Test get_database_metrics sans tâches récentes"""
        from api.routes.monitoring import get_database_metrics

        metrics = get_database_metrics(test_db)

        assert metrics["tasks_24h"]["total"] == 0
        assert metrics["tasks_24h"]["success_rate"] == 0.0
        assert metrics["status"] == "healthy"

    def test_get_database_metrics_old_tasks_ignored(self, test_db, test_user):
        """Test que les anciennes tâches (>24h) sont ignorées"""
        from api.routes.monitoring import get_database_metrics

        # Créer tâches vieilles de 48h
        old_time = datetime.now(timezone.utc) - timedelta(hours=48)
        for i in range(5):
            task = Task(
                title=f"Old task {i}",
                status=TaskStatus.DONE,
                created_by=test_user.id,
                created_at=old_time,
            )
            test_db.add(task)
        test_db.commit()

        metrics = get_database_metrics(test_db)

        # Aucune tâche comptée (trop anciennes)
        assert metrics["tasks_24h"]["total"] == 0


class TestSupervisordStatus:
    """Tests de la fonction get_supervisord_status()"""

    @patch("subprocess.run")
    def test_get_supervisord_status_all_running(self, mock_run):
        """Test get_supervisord_status avec tous workers running"""
        from api.routes.monitoring import get_supervisord_status

        # Mock supervisorctl output
        mock_run.return_value = Mock(
            returncode=0,
            stdout="celery                           RUNNING   pid 1234, uptime 1 day, 2:34:56\nworker2                          RUNNING   pid 5678, uptime 0:12:34\n",
        )

        status = get_supervisord_status()

        assert status["status"] == "healthy"
        assert "celery" in status["workers"]
        assert status["workers"]["celery"]["status"] == "RUNNING"
        assert status["workers"]["celery"]["healthy"] is True
        assert "worker2" in status["workers"]

    @patch("subprocess.run")
    def test_get_supervisord_status_some_stopped(self, mock_run):
        """Test get_supervisord_status avec workers arrêtés"""
        from api.routes.monitoring import get_supervisord_status

        mock_run.return_value = Mock(
            returncode=0,
            stdout="celery                           STOPPED   Not started\nworker2                          RUNNING   pid 5678\n",
        )

        status = get_supervisord_status()

        assert status["status"] == "degraded"
        assert status["workers"]["celery"]["status"] == "STOPPED"
        assert status["workers"]["celery"]["healthy"] is False

    @patch("subprocess.run")
    def test_get_supervisord_status_timeout(self, mock_run):
        """Test get_supervisord_status avec timeout"""
        from subprocess import TimeoutExpired
        from api.routes.monitoring import get_supervisord_status

        mock_run.side_effect = TimeoutExpired("supervisorctl", 5)

        status = get_supervisord_status()

        assert status["status"] == "unknown"
        assert "error" in status
        assert "timeout" in status["error"].lower()

    @patch("subprocess.run")
    def test_get_supervisord_status_not_configured(self, mock_run):
        """Test get_supervisord_status sans supervisord installé"""
        from api.routes.monitoring import get_supervisord_status

        mock_run.side_effect = FileNotFoundError()

        status = get_supervisord_status()

        assert status["status"] == "not_configured"
        assert status["workers"] == {}


class TestRecentErrors:
    """Tests de la fonction get_recent_errors()"""

    def test_get_recent_errors_with_failed_tasks(self, test_db, test_user):
        """Test get_recent_errors avec tâches échouées"""
        from api.routes.monitoring import get_recent_errors

        # Créer plusieurs tâches échouées
        for i in range(15):
            task = Task(
                title=f"Failed task {i}",
                description=f"Error description {i}" * 20,  # Description longue
                status=TaskStatus.CANCELLED,
                created_by=test_user.id,
                updated_at=datetime.now(timezone.utc) - timedelta(hours=i),
            )
            test_db.add(task)
        test_db.commit()

        errors = get_recent_errors(test_db, limit=10)

        assert len(errors) == 10  # Limité à 10
        assert errors[0]["type"] == "task_failed"
        assert "timestamp" in errors[0]
        assert "task_id" in errors[0]
        assert len(errors[0]["description"]) <= 100  # Tronqué à 100 chars

    def test_get_recent_errors_no_failures(self, test_db):
        """Test get_recent_errors sans échecs"""
        from api.routes.monitoring import get_recent_errors

        errors = get_recent_errors(test_db, limit=10)

        assert errors == []

    def test_get_recent_errors_ordering(self, test_db, test_user):
        """Test que les erreurs sont triées par date (plus récentes d'abord)"""
        from api.routes.monitoring import get_recent_errors

        # Créer tâches avec différentes dates
        old_task = Task(
            title="Old failed task",
            status=TaskStatus.CANCELLED,
            created_by=test_user.id,
            updated_at=datetime.now(timezone.utc) - timedelta(hours=10),
        )
        recent_task = Task(
            title="Recent failed task",
            status=TaskStatus.CANCELLED,
            created_by=test_user.id,
            updated_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        test_db.add_all([old_task, recent_task])
        test_db.commit()

        errors = get_recent_errors(test_db, limit=10)

        # La plus récente doit être en premier
        assert len(errors) == 2
        assert "Recent failed task" in errors[0]["title"]
        assert "Old failed task" in errors[1]["title"]
