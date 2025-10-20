"""
Constantes pour les modèles SQLAlchemy - Architecture unifiée 2025

Ce module centralise les strings dupliquées utilisées dans les ForeignKey
et autres définitions de colonnes pour respecter le principe DRY.
"""

# =====================================================
# TABLE NAMES
# =====================================================

TABLE_USERS = "users"
TABLE_ORGANISATIONS = "organisations"
TABLE_PEOPLE = "people"
TABLE_TASKS = "tasks"
TABLE_NOTIFICATIONS = "notifications"
TABLE_EMAIL_TEMPLATES = "email_templates"
TABLE_EMAIL_CAMPAIGNS = "email_campaigns"
TABLE_WORKFLOWS = "workflows"
TABLE_MANDATS = "mandats"
TABLE_DOCUMENTS = "documents"
TABLE_ORGANISATION_ACTIVITIES = "organisation_activities"

# =====================================================
# FOREIGN KEY REFERENCES
# =====================================================

FK_USERS_ID = f"{TABLE_USERS}.id"
FK_ORGANISATIONS_ID = f"{TABLE_ORGANISATIONS}.id"
FK_PEOPLE_ID = f"{TABLE_PEOPLE}.id"
FK_TASKS_ID = f"{TABLE_TASKS}.id"
FK_EMAIL_TEMPLATES_ID = f"{TABLE_EMAIL_TEMPLATES}.id"
FK_EMAIL_CAMPAIGNS_ID = f"{TABLE_EMAIL_CAMPAIGNS}.id"
FK_WORKFLOWS_ID = f"{TABLE_WORKFLOWS}.id"
FK_MANDATS_ID = f"{TABLE_MANDATS}.id"
FK_DOCUMENTS_ID = f"{TABLE_DOCUMENTS}.id"

# =====================================================
# ONDELETE ACTIONS
# =====================================================

ONDELETE_CASCADE = "CASCADE"
ONDELETE_SET_NULL = "SET NULL"
ONDELETE_RESTRICT = "RESTRICT"
ONDELETE_NO_ACTION = "NO ACTION"

# =====================================================
# COMMON ENUM NAMES (for SQLAlchemy Enum type naming)
# =====================================================

ENUM_TASK_STATUS = "taskstatus"
ENUM_TASK_PRIORITY = "taskpriority"
ENUM_TASK_CATEGORY = "taskcategory"
ENUM_NOTIFICATION_TYPE = "notificationtype"
ENUM_NOTIFICATION_PRIORITY = "notificationpriority"
ENUM_PIPELINE_STAGE = "pipelinestage"
ENUM_ORGANISATION_TYPE = "organisationtype"
ENUM_PERSON_ROLE = "personrole"
ENUM_INTERACTION_TYPE = "interactiontype"
ENUM_INTERACTION_DIRECTION = "interactiondirection"
ENUM_EMAIL_CAMPAIGN_STATUS = "emailcampaignstatus"
ENUM_EMAIL_SEND_STATUS = "emailsendstatus"
ENUM_WORKFLOW_STATUS = "workflowstatus"
ENUM_WORKFLOW_TRIGGER = "workflowtrigger"
ENUM_MANDAT_STATUS = "mandatstatus"
ENUM_DOCUMENT_TYPE = "documenttype"
