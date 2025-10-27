"""
Tests pour l'Agent IA
Tests unitaires du service AI et des endpoints
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, Mock, patch

import pytest

from models.ai_agent import AICache, AIConfiguration, AIExecution, AISuggestion
from schemas.ai_agent import (
    AIProviderEnum,
    AISuggestionStatusEnum,
    AISuggestionTypeEnum,
    AITaskTypeEnum,
)
from services.ai_agent import AIAgentService

# Aliases pour compatibilité
AIProvider = AIProviderEnum
AISuggestionStatus = AISuggestionStatusEnum
AISuggestionType = AISuggestionTypeEnum
AITaskType = AITaskTypeEnum


class TestAIAgentService:
    """Tests du service AIAgentService"""

    @pytest.fixture
    def ai_service(self, test_db):
        """Fixture pour créer une instance du service"""
        return AIAgentService(test_db)

    @pytest.fixture
    def mock_config(self, test_db):
        """Configuration AI pour les tests"""
        config = AIConfiguration(
            provider=AIProvider.ANTHROPIC,
            model_name="claude-3-5-sonnet-20241022",
            api_key="sk-test-key",
            temperature=0.3,
            max_tokens=1000,
            duplicate_threshold=0.85,
            enrichment_threshold=0.70,
            quality_threshold=0.60,
            auto_apply_enabled=False,
            auto_apply_threshold=0.95,
            daily_budget_usd=10.0,
            cache_enabled=True,
            cache_ttl_hours=24,
        )
        test_db.add(config)
        test_db.commit()
        return config

    @pytest.fixture
    def mock_organisation(self, test_db):
        """Organisation pour les tests"""
        from models.organisation import Organisation
        org = Organisation(
            nom="Test Company",
            website=None,
            general_email=None,
        )
        test_db.add(org)
        test_db.commit()
        return org

    # ===== Tests de configuration =====

    def test_get_config(self, ai_service, mock_config):
        """Test récupération configuration"""
        config = ai_service.get_config()
        assert config is not None
        assert config.provider == AIProvider.ANTHROPIC
        assert config.duplicate_threshold == 0.85

    def test_update_config(self, ai_service, mock_config):
        """Test mise à jour configuration"""
        updated = ai_service.update_config({
            "duplicate_threshold": 0.90,
            "auto_apply_enabled": True,
        })
        assert updated.duplicate_threshold == 0.90
        assert updated.auto_apply_enabled is True

    # ===== Tests de suggestions =====

    def test_create_suggestion(self, ai_service, mock_organisation):
        """Test création d'une suggestion"""
        suggestion = ai_service._create_suggestion(
            type=AISuggestionType.DATA_ENRICHMENT,
            entity_type="organisation",
            entity_id=mock_organisation.id,
            title="Enrichir website",
            description="Ajouter le site web manquant",
            suggestion_data={"website": "https://example.com"},
            confidence_score=0.92,
            execution_id=None,
        )

        assert suggestion.id is not None
        assert suggestion.type == AISuggestionType.DATA_ENRICHMENT
        assert suggestion.status == AISuggestionStatus.PENDING
        assert suggestion.confidence_score == 0.92

    def test_get_suggestions_with_filters(self, ai_service, db_session, mock_organisation):
        """Test récupération suggestions avec filtres"""
        # Créer plusieurs suggestions
        for i in range(3):
            suggestion = AISuggestion(
                type=AISuggestionType.DATA_ENRICHMENT,
                status=AISuggestionStatus.PENDING if i < 2 else AISuggestionStatus.APPROVED,
                entity_type="organisation",
                entity_id=mock_organisation.id,
                title=f"Suggestion {i}",
                description="Test",
                suggestion_data={},
                confidence_score=0.8 + (i * 0.05),
            )
            db_session.add(suggestion)
        db_session.commit()

        # Filtrer par statut
        pending = ai_service.get_suggestions(status=AISuggestionStatus.PENDING)
        assert len(pending) == 2

        # Filtrer par confiance minimale
        high_conf = ai_service.get_suggestions(min_confidence=0.85)
        assert len(high_conf) == 2  # Seulement celles avec 0.85 et 0.90

    def test_approve_suggestion(self, ai_service, db_session, mock_organisation):
        """Test approbation d'une suggestion"""
        suggestion = AISuggestion(
            type=AISuggestionType.DATA_ENRICHMENT,
            status=AISuggestionStatus.PENDING,
            entity_type="organisation",
            entity_id=mock_organisation.id,
            title="Test",
            description="Test",
            suggestion_data={"website": "https://example.com"},
            confidence_score=0.9,
        )
        db_session.add(suggestion)
        db_session.commit()

        # Approuver
        with patch.object(ai_service, '_apply_suggestion') as mock_apply:
            approved = ai_service.approve_suggestion(
                suggestion_id=suggestion.id,
                user_id=1,
                notes="Looks good",
            )

            assert approved.status == AISuggestionStatus.APPROVED
            assert approved.review_notes == "Looks good"
            assert approved.reviewed_at is not None
            mock_apply.assert_called_once()

    def test_reject_suggestion(self, ai_service, db_session, mock_organisation):
        """Test rejet d'une suggestion"""
        suggestion = AISuggestion(
            type=AISuggestionType.DATA_ENRICHMENT,
            status=AISuggestionStatus.PENDING,
            entity_type="organisation",
            entity_id=mock_organisation.id,
            title="Test",
            description="Test",
            suggestion_data={},
            confidence_score=0.5,
        )
        db_session.add(suggestion)
        db_session.commit()

        # Rejeter
        rejected = ai_service.reject_suggestion(
            suggestion_id=suggestion.id,
            user_id=1,
            reason="Not accurate",
        )

        assert rejected.status == AISuggestionStatus.REJECTED
        assert rejected.review_notes == "Not accurate"

    def test_batch_approve_suggestions(self, ai_service, db_session, mock_organisation):
        """Test approbation en masse"""
        # Créer 3 suggestions
        suggestion_ids = []
        for i in range(3):
            suggestion = AISuggestion(
                type=AISuggestionType.DATA_ENRICHMENT,
                status=AISuggestionStatus.PENDING,
                entity_type="organisation",
                entity_id=mock_organisation.id,
                title=f"Suggestion {i}",
                description="Test",
                suggestion_data={},
                confidence_score=0.9,
            )
            db_session.add(suggestion)
            db_session.flush()
            suggestion_ids.append(suggestion.id)
        db_session.commit()

        # Batch approve
        with patch.object(ai_service, '_apply_suggestion'):
            result = ai_service.batch_approve_suggestions(
                suggestion_ids=suggestion_ids,
                user_id=1,
            )

            assert result["total_requested"] == 3
            assert result["successful"] == 3
            assert result["failed"] == 0

    def test_preview_suggestion(self, ai_service, db_session, mock_organisation):
        """Test preview d'une suggestion"""
        suggestion = AISuggestion(
            type=AISuggestionType.DATA_ENRICHMENT,
            status=AISuggestionStatus.PENDING,
            entity_type="organisation",
            entity_id=mock_organisation.id,
            title="Enrichir website",
            description="Test",
            suggestion_data={"website": "https://example.com"},
            confidence_score=0.9,
        )
        db_session.add(suggestion)
        db_session.commit()

        # Preview
        preview = ai_service.preview_suggestion(suggestion.id)

        assert preview["suggestion_id"] == suggestion.id
        assert preview["entity_type"] == "organisation"
        assert "current_data" in preview
        assert "proposed_changes" in preview
        assert "changes_summary" in preview

    # ===== Tests de cache =====

    def test_cache_hit(self, ai_service, db_session, mock_config):
        """Test cache hit"""
        # Créer un cache
        cache_key = "test_key_123"
        cache = AICache(
            cache_key=cache_key,
            request_type="duplicate_check",
            request_data={"org_id": 1},
            response_data={"is_duplicate": False},
            hit_count=0,
        )
        db_session.add(cache)
        db_session.commit()

        # Get from cache
        cached = ai_service._get_from_cache(cache_key)
        assert cached is not None
        assert cached["is_duplicate"] is False

        # Vérifier hit_count incrémenté
        db_session.refresh(cache)
        assert cache.hit_count == 1

    def test_cache_miss(self, ai_service, mock_config):
        """Test cache miss"""
        cached = ai_service._get_from_cache("nonexistent_key")
        assert cached is None

    # ===== Tests d'exécutions =====

    def test_create_execution(self, ai_service):
        """Test création d'une exécution"""
        execution = ai_service._create_execution(
            task_type=AITaskType.DETECT_DUPLICATES,
            configuration_snapshot={"threshold": 0.85},
        )

        assert execution.id is not None
        assert execution.task_type == AITaskType.DETECT_DUPLICATES
        assert execution.status == "running"
        assert execution.started_at is not None

    def test_update_execution_success(self, ai_service, db_session):
        """Test mise à jour exécution (succès)"""
        execution = AIExecution(
            task_type=AITaskType.ENRICH_DATA,
            status="running",
            started_at=datetime.now(timezone.utc),
            configuration_snapshot={},
            total_items_processed=0,
            successful_items=0,
            failed_items=0,
            estimated_cost_usd=0.0,
        )
        db_session.add(execution)
        db_session.commit()

        # Update
        updated = ai_service._update_execution(
            execution_id=execution.id,
            status="completed",
            total_items=10,
            successful_items=8,
            failed_items=2,
            cost_usd=0.05,
        )

        assert updated.status == "completed"
        assert updated.total_items_processed == 10
        assert updated.successful_items == 8
        assert updated.failed_items == 2
        assert updated.actual_cost_usd == 0.05
        assert updated.completed_at is not None

    def test_get_statistics(self, ai_service, db_session, mock_organisation):
        """Test récupération statistiques"""
        # Créer des suggestions de test
        for i in range(5):
            status = AISuggestionStatus.PENDING if i < 2 else AISuggestionStatus.APPROVED
            suggestion = AISuggestion(
                type=AISuggestionType.DATA_ENRICHMENT,
                status=status,
                entity_type="organisation",
                entity_id=mock_organisation.id,
                title=f"Suggestion {i}",
                description="Test",
                suggestion_data={},
                confidence_score=0.85,
            )
            db_session.add(suggestion)
        db_session.commit()

        # Get stats
        stats = ai_service.get_statistics()

        assert stats["total_suggestions"] == 5
        assert stats["pending_suggestions"] == 2
        assert stats["approved_suggestions"] == 3
        assert "suggestions_by_type" in stats
        assert "suggestions_by_status" in stats


class TestAIAgentAPI:
    """Tests des endpoints API"""

    @pytest.fixture
    def mock_ai_service(self):
        """Mock du service AI"""
        with patch('api.routes.ai_agent.AIAgentService') as mock:
            yield mock.return_value

    def test_get_suggestions_endpoint(self, client, mock_ai_service):
        """Test GET /api/v1/ai/suggestions"""
        mock_ai_service.get_suggestions.return_value = [
            {
                "id": 1,
                "type": "data_enrichment",
                "status": "pending",
                "title": "Test",
            }
        ]

        response = client.get("/api/v1/ai/suggestions?status=pending")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == 1

    def test_approve_suggestion_endpoint(self, client, mock_ai_service):
        """Test POST /api/v1/ai/suggestions/{id}/approve"""
        mock_ai_service.approve_suggestion.return_value = {
            "id": 1,
            "status": "approved",
        }

        response = client.post(
            "/api/v1/ai/suggestions/1/approve",
            json={"notes": "Looks good"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"

    def test_batch_approve_endpoint(self, client, mock_ai_service):
        """Test POST /api/v1/ai/suggestions/batch/approve"""
        mock_ai_service.batch_approve_suggestions.return_value = {
            "total_requested": 3,
            "successful": 3,
            "failed": 0,
            "results": [],
        }

        response = client.post(
            "/api/v1/ai/suggestions/batch/approve",
            json={"suggestion_ids": [1, 2, 3]},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["successful"] == 3

    def test_preview_suggestion_endpoint(self, client, mock_ai_service):
        """Test GET /api/v1/ai/suggestions/{id}/preview"""
        mock_ai_service.preview_suggestion.return_value = {
            "suggestion_id": 1,
            "current_data": {},
            "proposed_changes": {},
            "changes_summary": [],
        }

        response = client.get("/api/v1/ai/suggestions/1/preview")

        assert response.status_code == 200
        data = response.json()
        assert data["suggestion_id"] == 1

    def test_get_statistics_endpoint(self, client, mock_ai_service):
        """Test GET /api/v1/ai/statistics"""
        mock_ai_service.get_statistics.return_value = {
            "total_suggestions": 10,
            "pending_suggestions": 3,
            "total_cost_usd": 5.50,
        }

        response = client.get("/api/v1/ai/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_suggestions"] == 10

    def test_update_config_endpoint(self, client, mock_ai_service):
        """Test PATCH /api/v1/ai/config"""
        mock_ai_service.update_config.return_value = {
            "duplicate_threshold": 0.90,
        }

        response = client.patch(
            "/api/v1/ai/config",
            json={"duplicate_threshold": 0.90},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["duplicate_threshold"] == 0.90
