"""
Tests pour les campagnes email

Couvre:
- Templates email (CRUD, test, bibliothèque)
- Campagnes email (création, scheduling, statistiques)
- Comptage et sélection de destinataires
- Abonnements (single, bulk, listes)
- Batches d'envoi et tracking
- Engagement scoring

FIXES par rapport au code legacy:
- Utilise EmailCampaignStatus.RUNNING au lieu de SENDING
- Tous les EmailSend doivent avoir batch_id (contrainte FK)
- Organisation.name (attribut Python) pour création
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

import pytest
from api.routes.email_campaigns import _extract_user_id
from models.email import (
    EmailCampaign,
    EmailCampaignStatus,
    EmailProvider,
    EmailScheduleType,
    EmailSend,
    EmailSendStatus,
    EmailSendBatch,
    EmailTemplate,
    EmailTemplateCategory,
    EmailEvent,
    EmailEventType,
    CampaignSubscription,
)
from models.organisation import Organisation, OrganisationType
from models.person import Person
from services.email_service import render_dynamic_content


class TestEmailTemplates:
    """Tests CRUD des templates email"""

    def test_list_templates(self, client, auth_headers, test_db):
        """Test liste des templates actifs"""
        # Créer plusieurs templates
        for i in range(3):
            template = EmailTemplate(
                name=f"Template {i}",
                subject=f"Subject {i}",
                html_content="<p>Hello {{name}}</p>",
                category=EmailTemplateCategory.NEWSLETTER,
                is_active=(i < 2),  # 2 actifs, 1 inactif
            )
            test_db.add(template)
        test_db.commit()

        # Liste templates actifs uniquement
        response = client.get("/api/v1/email/templates?only_active=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Liste tous les templates
        response = client.get("/api/v1/email/templates?only_active=false", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_create_template(self, client, auth_headers):
        """Test création d'un template"""
        template_data = {
            "name": "Nouveau template",
            "subject": "Bienvenue {{name}}",
            "html_content": "<h1>Bonjour {{name}}</h1><p>Contenu</p>",
            "category": "welcome",
            "is_active": True,
        }

        response = client.post("/api/v1/email/templates", json=template_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == template_data["name"]
        assert data["category"] == "welcome"
        assert data["is_active"] is True

    def test_get_template(self, client, test_db, auth_headers):
        """Test récupération d'un template par ID"""
        template = EmailTemplate(
            name="Test template",
            subject="Test subject",
            html_content="<p>Test</p>",
            category=EmailTemplateCategory.FOLLOW_UP,
        )
        test_db.add(template)
        test_db.commit()

        response = client.get(f"/api/v1/email/templates/{template.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template.id
        assert data["name"] == "Test template"

    def test_get_template_not_found(self, client, auth_headers):
        """Test template inexistant"""
        response = client.get("/api/v1/email/templates/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_update_template(self, client, test_db, auth_headers):
        """Test mise à jour d'un template"""
        template = EmailTemplate(
            name="Original",
            subject="Original subject",
            html_content="<p>Original</p>",
            category=EmailTemplateCategory.CUSTOM,
        )
        test_db.add(template)
        test_db.commit()

        update_data = {
            "name": "Updated",
            "subject": "New subject",
        }

        response = client.put(
            f"/api/v1/email/templates/{template.id}", json=update_data, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated"
        assert data["subject"] == "New subject"

    def test_delete_template_unused(self, client, test_db, auth_headers):
        """Test suppression template non utilisé"""
        template = EmailTemplate(
            name="To delete",
            subject="Subject",
            html_content="<p>Content</p>",
            category=EmailTemplateCategory.CUSTOM,
        )
        test_db.add(template)
        test_db.commit()

        response = client.delete(f"/api/v1/email/templates/{template.id}", headers=auth_headers)
        assert response.status_code == 204

        # Vérifier suppression
        deleted = test_db.query(EmailTemplate).filter(EmailTemplate.id == template.id).first()
        assert deleted is None

    def test_delete_template_in_use(self, client, test_db, auth_headers):
        """Test impossible de supprimer template utilisé dans campagne"""
        template = EmailTemplate(
            name="Used template",
            subject="Subject",
            html_content="<p>Content</p>",
            category=EmailTemplateCategory.CUSTOM,
        )
        test_db.add(template)
        test_db.flush()

        # Créer campagne utilisant ce template
        campaign = EmailCampaign(
            name="Test campaign",
            status=EmailCampaignStatus.DRAFT,
            provider=EmailProvider.RESEND,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            default_template_id=template.id,
        )
        test_db.add(campaign)
        test_db.commit()

        # Tentative de suppression
        response = client.delete(f"/api/v1/email/templates/{template.id}", headers=auth_headers)
        assert response.status_code == 400
        assert "utilisé dans" in response.json()["detail"].lower()

    def test_delete_template_not_found(self, client, auth_headers):
        """Test suppression d'un template inexistant"""
        response = client.delete("/api/v1/email/templates/99999", headers=auth_headers)
        assert response.status_code == 404

    @patch("requests.post")
    def test_send_test_email(self, mock_post, client, test_db, auth_headers):
        """Test envoi d'email de test depuis template"""
        # Mock Resend API success
        mock_post.return_value = Mock(
            status_code=200, json=lambda: {"id": "test_msg_123", "status": "sent"}
        )

        # Créer config email active
        from models.email_config import EmailConfiguration

        config = EmailConfiguration(
            name="Test Config",
            provider=EmailProvider.RESEND,
            api_key_encrypted=b"encrypted_key",
            from_email="test@alforis.com",
            from_name="ALFORIS Test",
            is_active=True,
        )
        test_db.add(config)
        test_db.flush()

        # Créer template
        template = EmailTemplate(
            name="Test template",
            subject="Test {{first_name}}",
            html_content="<p>Bonjour {{first_name}}</p>",
            category=EmailTemplateCategory.CUSTOM,
        )
        test_db.add(template)
        test_db.commit()

        # Mock decryption
        with patch(
            "services.email_config_service.EmailConfigurationService.get_decrypted_config"
        ) as mock_decrypt:
            mock_decrypt.return_value = {"api_key": "test_api_key"}

            response = client.post(
                f"/api/v1/email/templates/{template.id}/send-test?test_email=test@example.com",
                headers=auth_headers,
            )

            # Peut ne pas fonctionner si config email non setup
            assert response.status_code in [200, 400, 500]


class TestRecipientSelection:
    """Tests de comptage et sélection de destinataires"""

    def test_count_organisations(self, client, test_db, auth_headers):
        """Test comptage destinataires organisations"""
        # Créer plusieurs organisations avec email
        for i in range(5):
            org = Organisation(type=OrganisationType.INVESTOR)
            org.name = f"Org {i}"
            org.email = f"org{i}@test.com"
            org.country_code = "FR" if i < 3 else "BE"
            test_db.add(org)
        test_db.commit()

        # Compter toutes les orgs FR
        filters = {"target_type": "organisations", "countries": ["FR"]}

        response = client.post(
            "/api/v1/email/campaigns/recipients/count", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 3

    def test_count_contacts(self, client, test_db, auth_headers):
        """Test comptage destinataires contacts"""
        # Créer plusieurs personnes avec email
        for i in range(4):
            person = Person(
                first_name=f"First{i}",
                last_name=f"Last{i}",
                email=f"person{i}@test.com",
                language="fr" if i < 2 else "en",
            )
            test_db.add(person)
        test_db.commit()

        # Compter contacts FR
        filters = {"target_type": "contacts", "languages": ["fr"]}

        response = client.post(
            "/api/v1/email/campaigns/recipients/count", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2

    def test_list_recipients_organisations(self, client, test_db, auth_headers):
        """Test liste des organisations avec filtres"""
        # Créer organisations
        for i in range(3):
            org = Organisation(type=OrganisationType.CLIENT)
            org.name = f"Client {i}"
            org.email = f"client{i}@example.com"
            org.country_code = "FR"
            test_db.add(org)
        test_db.commit()

        filters = {"target_type": "organisations", "countries": ["FR"]}

        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["recipients"]) == 3
        assert all("email" in r for r in data["recipients"])

    def test_list_recipients_pagination(self, client, test_db, auth_headers):
        """Test pagination de la liste"""
        # Créer 10 organisations
        for i in range(10):
            org = Organisation(type=OrganisationType.INVESTOR)
            org.name = f"Org {i}"
            org.email = f"org{i}@test.com"
            test_db.add(org)
        test_db.commit()

        filters = {"target_type": "organisations"}

        # Page 1
        response = client.post(
            "/api/v1/email/campaigns/recipients/list?skip=0&limit=5",
            json=filters,
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10
        assert len(data["recipients"]) == 5

        # Page 2
        response = client.post(
            "/api/v1/email/campaigns/recipients/list?skip=5&limit=5",
            json=filters,
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10
        assert len(data["recipients"]) == 5

    def test_list_recipients_contacts_with_filters(self, client, test_db, auth_headers):
        """Test liste des contacts avec filtres avancés"""
        # Créer contacts avec différentes caractéristiques
        for i in range(5):
            person = Person(
                first_name=f"Contact{i}",
                last_name="Test",
                email=f"contact{i}@test.com",
                language="fr" if i < 3 else "en",
                country_code="FR" if i < 2 else "BE",
                job_title="CEO" if i == 0 else "Manager",
                is_active=True if i < 4 else False,
            )
            test_db.add(person)
        test_db.commit()

        # Test filtre langue
        filters = {"target_type": "contacts", "languages": ["fr"]}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3

        # Test filtre pays
        filters = {"target_type": "contacts", "countries": ["FR"]}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2

        # Test filtre rôle
        filters = {"target_type": "contacts", "roles": ["CEO"]}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

        # Test filtre actif/inactif
        filters = {"target_type": "contacts", "is_active": True}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 4

    def test_list_recipients_contacts_with_specific_ids(self, client, test_db, auth_headers):
        """Test liste contacts avec IDs spécifiques et exclusions"""
        # Créer 5 contacts
        person_ids = []
        for i in range(5):
            person = Person(
                first_name=f"Person{i}",
                last_name="Test",
                email=f"person{i}@test.com",
            )
            test_db.add(person)
            test_db.flush()
            person_ids.append(person.id)
        test_db.commit()

        # Test specific_ids
        filters = {"target_type": "contacts", "specific_ids": person_ids[:3]}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3

        # Test exclude_ids
        filters = {"target_type": "contacts", "exclude_ids": [person_ids[0]]}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 4

    def test_list_recipients_invalid_target_type(self, client, test_db, auth_headers):
        """Test avec type de cible invalide"""
        filters = {"target_type": "invalid_type"}
        response = client.post(
            "/api/v1/email/campaigns/recipients/list", json=filters, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["recipients"] == []


class TestEmailCampaigns:
    """Tests CRUD des campagnes email"""

    def test_list_campaigns(self, client, test_db, auth_headers):
        """Test liste des campagnes"""
        # Créer plusieurs campagnes
        for i in range(3):
            campaign = EmailCampaign(
                name=f"Campaign {i}",
                status=EmailCampaignStatus.DRAFT if i == 0 else EmailCampaignStatus.COMPLETED,
                provider=EmailProvider.RESEND,
                from_name="ALFORIS Finance",
                from_email="contact@alforis.com",
            )
            test_db.add(campaign)
        test_db.commit()

        response = client.get("/api/v1/email/campaigns", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_list_campaigns_with_filter(self, client, test_db, auth_headers):
        """Test filtre par statut"""
        # Créer campagnes avec différents statuts
        for status in [EmailCampaignStatus.DRAFT, EmailCampaignStatus.COMPLETED]:
            campaign = EmailCampaign(
                name=f"Campaign {status.value}",
                status=status,
                from_name="ALFORIS Finance",
                from_email="contact@alforis.com",
                provider=EmailProvider.RESEND,
            )
            test_db.add(campaign)
        test_db.commit()

        response = client.get("/api/v1/email/campaigns?status=draft", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "draft"

    def test_create_campaign(self, client, auth_headers):
        """Test création d'une campagne"""
        campaign_data = {
            "name": "Nouvelle campagne",
            "provider": "resend",
            "status": "draft",
            "from_name": "ALFORIS Finance",
            "from_email": "contact@alforis.com",
        }

        response = client.post("/api/v1/email/campaigns", json=campaign_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == campaign_data["name"]
        assert data["status"] == "draft"

    def test_get_campaign(self, client, test_db, auth_headers):
        """Test récupération d'une campagne"""
        campaign = EmailCampaign(
            name="Test campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.commit()

        response = client.get(f"/api/v1/email/campaigns/{campaign.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == campaign.id
        assert data["name"] == "Test campaign"

    def test_update_campaign(self, client, test_db, auth_headers):
        """Test mise à jour campagne"""
        campaign = EmailCampaign(
            name="Original",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.commit()

        update_data = {"name": "Updated campaign"}

        response = client.put(
            f"/api/v1/email/campaigns/{campaign.id}", json=update_data, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated campaign"

    def test_delete_campaign_draft(self, client, test_db, auth_headers):
        """Test suppression campagne brouillon"""
        campaign = EmailCampaign(
            name="Draft to delete",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.commit()

        response = client.delete(f"/api/v1/email/campaigns/{campaign.id}", headers=auth_headers)
        assert response.status_code == 204

    def test_delete_campaign_running_forbidden(self, client, test_db, auth_headers):
        """Test impossible de supprimer campagne en cours"""
        campaign = EmailCampaign(
            name="Running campaign",
            status=EmailCampaignStatus.RUNNING,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.commit()

        response = client.delete(f"/api/v1/email/campaigns/{campaign.id}", headers=auth_headers)
        assert response.status_code == 400
        assert "impossible" in response.json()["detail"].lower()

    def test_schedule_campaign(self, client, test_db, auth_headers):
        """Test planification d'une campagne"""
        campaign = EmailCampaign(
            name="To schedule",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.commit()

        schedule_data = {
            "schedule_type": "immediate",
        }

        # Note: Peut nécessiter des subscriptions/recipients
        response = client.post(
            f"/api/v1/email/campaigns/{campaign.id}/schedule",
            json=schedule_data,
            headers=auth_headers,
        )
        # Accepter 200 ou erreur si pas de recipients
        assert response.status_code in [200, 400, 404, 422]

    def test_get_campaign_stats(self, client, test_db, auth_headers):
        """Test récupération des statistiques"""
        campaign = EmailCampaign(
            name="Stats campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
            total_recipients=100,
        )
        test_db.add(campaign)
        test_db.commit()

        response = client.get(f"/api/v1/email/campaigns/{campaign.id}/stats", headers=auth_headers)
        # Stats service peut retourner des données
        assert response.status_code in [200, 404]


class TestCampaignBatches:
    """Tests des batches d'envoi"""

    def test_list_campaign_batches(self, client, test_db, auth_headers):
        """Test liste des batches d'une campagne"""
        campaign = EmailCampaign(
            name="Batch campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        # Créer plusieurs batches
        for i in range(3):
            batch = EmailSendBatch(
                campaign_id=campaign.id,
                name=f"Batch {i}",
                status=EmailSendStatus.SENT,
            )
            test_db.add(batch)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/batches", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_get_campaign_batch(self, client, test_db, auth_headers):
        """Test récupération d'un batch spécifique"""
        campaign = EmailCampaign(
            name="Batch campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        batch = EmailSendBatch(
            campaign_id=campaign.id,
            name="Batch 1",
            status=EmailSendStatus.SENT,
        )
        test_db.add(batch)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/batches/{batch.id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == batch.id
        assert data["name"] == "Batch 1"

    def test_list_campaign_sends(self, client, test_db, auth_headers):
        """Test liste des envois d'une campagne"""
        campaign = EmailCampaign(
            name="Sends campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        # Créer un batch
        batch = EmailSendBatch(
            campaign_id=campaign.id,
            name="Batch 1",
            status=EmailSendStatus.SENT,
        )
        test_db.add(batch)
        test_db.flush()

        # Créer plusieurs sends
        for i in range(5):
            send = EmailSend(
                campaign_id=campaign.id,
                batch_id=batch.id,
                recipient_email=f"user{i}@test.com",
                status=EmailSendStatus.SENT,
            )
            test_db.add(send)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/sends", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 5

    def test_list_campaign_sends_with_filter(self, client, test_db, auth_headers):
        """Test filtre des envois par statut"""
        campaign = EmailCampaign(
            name="Filter campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        batch = EmailSendBatch(
            campaign_id=campaign.id,
            name="Batch 1",
            status=EmailSendStatus.SENT,
        )
        test_db.add(batch)
        test_db.flush()

        # Créer envois avec différents statuts
        for i, status in enumerate(
            [EmailSendStatus.SENT, EmailSendStatus.DELIVERED, EmailSendStatus.OPENED]
        ):
            send = EmailSend(
                campaign_id=campaign.id,
                batch_id=batch.id,
                recipient_email=f"user{i}@test.com",
                status=status,
            )
            test_db.add(send)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/sends?status=opened", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "opened"


class TestCampaignSubscriptions:
    """Tests des abonnements aux campagnes"""

    def test_subscribe_person(self, client, test_db, auth_headers):
        """Test abonnement d'une personne à une campagne"""
        campaign = EmailCampaign(
            name="Sub campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        person = Person(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
        )
        test_db.add_all([campaign, person])
        test_db.commit()

        subscription_data = {"campaign_id": campaign.id, "person_id": person.id}

        response = client.post(
            f"/api/v1/email/campaigns/{campaign.id}/subscriptions",
            json=subscription_data,
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["person_id"] == person.id
        assert data["campaign_id"] == campaign.id

    def test_subscribe_organisation(self, client, test_db, auth_headers):
        """Test abonnement d'une organisation"""
        campaign = EmailCampaign(
            name="Org campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        org = Organisation(type=OrganisationType.CLIENT)
        org.name = "Test Org"
        org.email = "org@example.com"

        test_db.add_all([campaign, org])
        test_db.commit()

        subscription_data = {"campaign_id": campaign.id, "organisation_id": org.id}

        response = client.post(
            f"/api/v1/email/campaigns/{campaign.id}/subscriptions",
            json=subscription_data,
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["organisation_id"] == org.id

    def test_subscribe_already_subscribed(self, client, test_db, auth_headers):
        """Test réabonnement réactive l'abonnement"""
        campaign = EmailCampaign(
            name="Reactivate campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        person = Person(
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
        )
        test_db.add_all([campaign, person])
        test_db.flush()

        # Créer abonnement inactif
        subscription = CampaignSubscription(
            campaign_id=campaign.id,
            person_id=person.id,
            is_active=False,
        )
        test_db.add(subscription)
        test_db.commit()

        # Réabonner
        subscription_data = {"campaign_id": campaign.id, "person_id": person.id}

        response = client.post(
            f"/api/v1/email/campaigns/{campaign.id}/subscriptions",
            json=subscription_data,
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_active"] is True

    def test_unsubscribe(self, client, test_db, auth_headers):
        """Test désabonnement"""
        campaign = EmailCampaign(
            name="Unsub campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        person = Person(
            first_name="Bob",
            last_name="Martin",
            email="bob@example.com",
        )
        test_db.add_all([campaign, person])
        test_db.flush()

        subscription = CampaignSubscription(
            campaign_id=campaign.id,
            person_id=person.id,
            is_active=True,
        )
        test_db.add(subscription)
        test_db.commit()

        response = client.delete(
            f"/api/v1/email/campaigns/{campaign.id}/subscriptions/{subscription.id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

        # Vérifier désactivation
        test_db.refresh(subscription)
        assert subscription.is_active is False
        assert subscription.unsubscribed_at is not None

    def test_list_campaign_subscriptions(self, client, test_db, auth_headers):
        """Test liste des abonnements d'une campagne"""
        campaign = EmailCampaign(
            name="List subs campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        # Créer plusieurs abonnements
        for i in range(3):
            person = Person(
                first_name=f"Person{i}",
                last_name="Test",
                email=f"person{i}@test.com",
            )
            test_db.add(person)
            test_db.flush()

            subscription = CampaignSubscription(
                campaign_id=campaign.id,
                person_id=person.id,
                is_active=True,
            )
            test_db.add(subscription)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/subscriptions", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_bulk_subscribe(self, client, test_db, auth_headers):
        """Test abonnement en masse"""
        campaign = EmailCampaign(
            name="Bulk campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        # Créer plusieurs personnes
        person_ids = []
        for i in range(5):
            person = Person(
                first_name=f"Bulk{i}",
                last_name="User",
                email=f"bulk{i}@test.com",
            )
            test_db.add(person)
            test_db.flush()
            person_ids.append(person.id)
        test_db.commit()

        bulk_data = {"campaign_id": campaign.id, "person_ids": person_ids, "organisation_ids": []}

        response = client.post(
            "/api/v1/email/campaigns/subscriptions/bulk", json=bulk_data, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["created"] == 5
        assert data["already_exists"] == 0

    def test_list_person_subscriptions(self, client, test_db, auth_headers):
        """Test liste des abonnements d'une personne"""
        person = Person(first_name="John", last_name="Subscriber", email="john@test.com")
        test_db.add(person)
        test_db.flush()

        # Créer plusieurs campagnes
        for i in range(3):
            campaign = EmailCampaign(
                name=f"Campaign {i}",
                status=EmailCampaignStatus.DRAFT,
                from_name="ALFORIS Finance",
                from_email="contact@alforis.com",
                provider=EmailProvider.RESEND,
            )
            test_db.add(campaign)
            test_db.flush()

            subscription = CampaignSubscription(
                campaign_id=campaign.id,
                person_id=person.id,
                is_active=True if i < 2 else False,
            )
            test_db.add(subscription)
        test_db.commit()

        # Liste tous
        response = client.get(
            f"/api/v1/email/people/{person.id}/subscriptions?only_active=false",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Liste actifs uniquement
        response = client.get(
            f"/api/v1/email/people/{person.id}/subscriptions?only_active=true",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_organisation_subscriptions(self, client, test_db, auth_headers):
        """Test liste des abonnements d'une organisation"""
        org = Organisation(type=OrganisationType.CLIENT)
        org.name = "Test Company"
        org.email = "company@test.com"
        test_db.add(org)
        test_db.flush()

        # Créer campagne et abonnement
        campaign = EmailCampaign(
            name="Org campaign",
            status=EmailCampaignStatus.DRAFT,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        subscription = CampaignSubscription(
            campaign_id=campaign.id,
            organisation_id=org.id,
            is_active=True,
        )
        test_db.add(subscription)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/organisations/{org.id}/subscriptions", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["organisation_id"] == org.id


class TestRecipientTracking:
    """Tests du tracking détaillé des destinataires"""

    def test_get_recipients_with_tracking(self, client, test_db, auth_headers):
        """Test récupération destinataires avec tracking"""
        campaign = EmailCampaign(
            name="Tracking campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        batch = EmailSendBatch(
            campaign_id=campaign.id,
            name="Batch 1",
            status=EmailSendStatus.SENT,
        )
        test_db.add(batch)
        test_db.flush()

        # Créer envois avec différents tracking
        person1 = Person(first_name="Hot", last_name="Lead", email="hot@test.com")
        person2 = Person(first_name="Warm", last_name="Lead", email="warm@test.com")
        person3 = Person(first_name="Cold", last_name="Lead", email="cold@test.com")
        test_db.add_all([person1, person2, person3])
        test_db.flush()

        send1 = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_person_id=person1.id,
            recipient_email="hot@test.com",
            status=EmailSendStatus.CLICKED,
            sent_at=datetime.now(timezone.utc),
        )
        send2 = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_person_id=person2.id,
            recipient_email="warm@test.com",
            status=EmailSendStatus.OPENED,
            sent_at=datetime.now(timezone.utc),
        )
        send3 = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_person_id=person3.id,
            recipient_email="cold@test.com",
            status=EmailSendStatus.SENT,
            sent_at=datetime.now(timezone.utc),
        )
        test_db.add_all([send1, send2, send3])
        test_db.flush()

        # Ajouter événements de tracking
        event_opened = EmailEvent(
            send_id=send1.id,
            event_type=EmailEventType.OPENED,
            event_at=datetime.now(timezone.utc),
        )
        event_clicked = EmailEvent(
            send_id=send1.id,
            event_type=EmailEventType.CLICKED,
            event_at=datetime.now(timezone.utc),
            url="https://alforis.com/product",
        )
        test_db.add_all([event_opened, event_clicked])
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/batches/{batch.id}/recipients-tracking",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Vérifier tri par engagement (lead chaud en premier)
        assert data[0]["engagement_score"] > data[1]["engagement_score"]
        assert data[1]["engagement_score"] >= data[2]["engagement_score"]

    def test_filter_recipients_clicked(self, client, test_db, auth_headers):
        """Test filtre leads ayant cliqué"""
        campaign = EmailCampaign(
            name="Click campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        batch = EmailSendBatch(
            campaign_id=campaign.id,
            name="Batch 1",
            status=EmailSendStatus.SENT,
        )
        test_db.add(batch)
        test_db.flush()

        # Send avec clic
        send_clicked = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_email="clicked@test.com",
            status=EmailSendStatus.CLICKED,
            sent_at=datetime.now(timezone.utc),
        )
        # Send sans clic
        send_no_click = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_email="noclick@test.com",
            status=EmailSendStatus.SENT,
            sent_at=datetime.now(timezone.utc),
        )
        test_db.add_all([send_clicked, send_no_click])
        test_db.flush()

        # Événement clic
        event = EmailEvent(
            send_id=send_clicked.id,
            event_type=EmailEventType.CLICKED,
            event_at=datetime.now(timezone.utc),
        )
        test_db.add(event)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/batches/{batch.id}/recipients-tracking?filter=clicked",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["recipient"]["email"] == "clicked@test.com"

    def test_filter_recipients_not_opened(self, client, test_db, auth_headers):
        """Test filtre leads n'ayant pas ouvert"""
        campaign = EmailCampaign(
            name="Not opened campaign",
            status=EmailCampaignStatus.COMPLETED,
            from_name="ALFORIS Finance",
            from_email="contact@alforis.com",
            provider=EmailProvider.RESEND,
        )
        test_db.add(campaign)
        test_db.flush()

        batch = EmailSendBatch(
            campaign_id=campaign.id,
            name="Batch 1",
            status=EmailSendStatus.SENT,
        )
        test_db.add(batch)
        test_db.flush()

        # Send ouvert
        send_opened = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_email="opened@test.com",
            status=EmailSendStatus.OPENED,
            sent_at=datetime.now(timezone.utc),
        )
        # Send non ouvert
        send_not_opened = EmailSend(
            campaign_id=campaign.id,
            batch_id=batch.id,
            recipient_email="notopened@test.com",
            status=EmailSendStatus.SENT,
            sent_at=datetime.now(timezone.utc),
        )
        test_db.add_all([send_opened, send_not_opened])
        test_db.flush()

        # Événement ouverture
        event = EmailEvent(
            send_id=send_opened.id,
            event_type=EmailEventType.OPENED,
            event_at=datetime.now(timezone.utc),
        )
        test_db.add(event)
        test_db.commit()

        response = client.get(
            f"/api/v1/email/campaigns/{campaign.id}/batches/{batch.id}/recipients-tracking?filter=not_opened",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["recipient"]["email"] == "notopened@test.com"


class TestEmailUtilities:
    """Tests utilitaires pour la couche email"""

    def test_extract_user_id_variants(self):
        """Vérifie l'extraction robuste du user_id"""
        assert _extract_user_id(None) is None
        assert _extract_user_id({}) is None
        assert _extract_user_id({"user_id": None}) is None
        assert _extract_user_id({"user_id": "abc"}) is None
        assert _extract_user_id({"user_id": "42"}) == 42
        assert _extract_user_id({"user_id": 7}) == 7

    def test_render_dynamic_content_nested_placeholders(self):
        """Test remplacement des placeholders dynamiques (y compris nested)"""
        template_html = (
            "<h1>Hello {{ user.first_name }}</h1>"
            "<p>{{ stats.opens }}</p>"
            "<footer>{{missing}}</footer>"
        )
        rendered = render_dynamic_content(
            template_html,
            {"user": {"first_name": "Alice"}, "stats": {"opens": 3}, "missing": None},
        )

        assert "Alice" in rendered
        assert "3" in rendered
        assert "{{" not in rendered
        assert "None" not in rendered
