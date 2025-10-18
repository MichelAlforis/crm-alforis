# 📚 Sommaire Documentation CRM Alforis

Bienvenue dans l’espace documentaire du CRM. Chaque section ci-dessous correspond à un sous-dossier de `documentation/` et rassemble des fiches complémentaires. Utilisez ce sommaire pour trouver en quelques secondes la ressource adaptée à votre besoin.

---

## 🗂️ Navigation rapide
- [Overview](#overview--vision-densemble) – Vision globale, résumés et analyses.
- [Roadmap](#roadmap--planification) – Plans d’action et suivi des versions.
- [Guides](#guides--pas-à-pas-techniques) – Tutoriels détaillés pour exécuter les chantiers.
- [Operations](#operations--runbooks--support) – Procédures quotidiennes, hotfix et contrôles.
- [Backend](#backend) – Checklists et guides API côté serveur.
- [Frontend](#frontend) – Documentation Next.js et refontes UI.
- [Scripts](#scripts) – Dépannage des utilitaires CLI.
- [Bibliothèque README](#bibliothèque-readme) – Index complet des README centralisés.

---

## Overview · Vision d’ensemble
| Fichier | Contenu principal |
|---------|------------------|
| [`overview/START_HERE.md`](overview/START_HERE.md) | Point d’entrée express : statut, parcours recommandé, liens critiques. |
| [`overview/RESUME_AMELIORATIONS.md`](overview/RESUME_AMELIORATIONS.md) | Résumé des 12 améliorations, priorités et estimation d’effort. |
| [`overview/VISUALISATION_AMELIORATIONS.md`](overview/VISUALISATION_AMELIORATIONS.md) | Diagrammes ASCII et vues avant/après pour comprendre l’architecture cible. |
| [`overview/ANALYSE_ARCHITECTURE_CRM.md`](overview/ANALYSE_ARCHITECTURE_CRM.md) | Analyse détaillée des duplications et de la cible unifiée. |
| [`overview/ETAT_PROJET.md`](overview/ETAT_PROJET.md) | État actuel du projet : risques, dépendances, next steps. |
| [`overview/RESUME_SEMAINE3_PERFORMANCE.md`](overview/RESUME_SEMAINE3_PERFORMANCE.md) | Récap de la semaine 3, focus performance et mesures. |
| [`overview/SEMAINE4_RESUME.md`](overview/SEMAINE4_RESUME.md) | Récap de la semaine 4, points de vigilance et décisions. |

---

## Roadmap · Planification
| Fichier | Contenu principal |
|---------|------------------|
| [`roadmap/PLAN_AMELIORATIONS_CRM.md`](roadmap/PLAN_AMELIORATIONS_CRM.md) | Plan sur 6 semaines, objectifs par sprint et owners. |
| [`roadmap/CHANGELOG_AMELIORATIONS.md`](roadmap/CHANGELOG_AMELIORATIONS.md) | Historique des versions livrées, jalons et hotfix. |
| [`roadmap/SETTINGS_IMPROVEMENTS.md`](roadmap/SETTINGS_IMPROVEMENTS.md) | Pistes d’amélioration des paramètres et toggles produit. |

---

## Guides · Pas-à-pas techniques
| Fichier | Contenu principal |
|---------|------------------|
| [`guides/GUIDE_MIGRATION_ARCHITECTURE.md`](guides/GUIDE_MIGRATION_ARCHITECTURE.md) | Tutoriel complet pour unifier la base de données (préparation → validation). |
| [`guides/IMPORT_REFACTOR.md`](guides/IMPORT_REFACTOR.md) | Refonte de l’import investisseurs : workflow, scripts, QA. |
| [`guides/MONITORING_COMPLET.md`](guides/MONITORING_COMPLET.md) | Mise en place du monitoring (alertes, SLO, dashboards). |
| [`guides/PERFORMANCE_COMPLET.md`](guides/PERFORMANCE_COMPLET.md) | Optimisations backend/frontend pour réduire latence et coût. |
| [`guides/TESTS_AUTOMATISES_COMPLET.md`](guides/TESTS_AUTOMATISES_COMPLET.md) | Guide pytest : fixtures, coverage, stratégies de tests. |
| [`guides/PRODUCTION_QUICKSTART.md`](guides/PRODUCTION_QUICKSTART.md) | Checklists pour démarrer et valider un environnement de production. |

---

## Operations · Runbooks & support
| Fichier | Contenu principal |
|---------|------------------|
| [`operations/BUGFIX_PRODUCTION.md`](operations/BUGFIX_PRODUCTION.md) | Plan d’action en cas d’incident critique côté production. |
| [`operations/CORRECTION_IMMEDIATE.md`](operations/CORRECTION_IMMEDIATE.md) | Procédure d’intervention d’urgence (hotfix express). |
| [`operations/SERVEUR_COMMANDES.md`](operations/SERVEUR_COMMANDES.md) | Commandes Docker/infra prêtes à copier. |
| [`operations/FICHIERS_CREES.md`](operations/FICHIERS_CREES.md) | Historique des fichiers générés lors des chantiers. |
| [`operations/VERIFICATION_COMPLETION.md`](operations/VERIFICATION_COMPLETION.md) | Checklist finale avant go-live (tests, données, monitoring). |

---

## Backend
| Fichier | Contenu principal |
|---------|------------------|
| [`backend/checklist.md`](backend/checklist.md) | Checklist backend (API, sécurité, migrations) avant livraison. |
| [`backend/api/IMPORTS_USAGE.md`](backend/api/IMPORTS_USAGE.md) | Guide d’utilisation des routes d’import backend. |

---

## Frontend
| Fichier | Contenu principal |
|---------|------------------|
| [`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md) | Architecture Next.js, découpage des modules et flux de données. |
| [`frontend/STRUCTURE.md`](frontend/STRUCTURE.md) | Arborescence, conventions et patterns UI partagés. |
| [`frontend/IMPLEMENTATION_STATUS.md`](frontend/IMPLEMENTATION_STATUS.md) | Suivi d’avancement des écrans et fonctionnalités. |
| [`frontend/REFONTE_CRM_GUIDE.md`](frontend/REFONTE_CRM_GUIDE.md) | Stratégie de refonte UI/UX et priorités de design. |
| [`frontend/IMPROVEMENTS.md`](frontend/IMPROVEMENTS.md) | Backlog d’améliorations frontend (DX, UX, tooling). |
| [`frontend/PRODUCTION_DEPLOY.md`](frontend/PRODUCTION_DEPLOY.md) | Procédure de déploiement frontend en production. |
| [`frontend/QUICK_START.md`](frontend/QUICK_START.md) | Onboarding développeur, scripts essentiels, configuration. |
| [`frontend/REFACTORING.md`](frontend/REFACTORING.md) | Liste des refactorings réalisés et restants. |

---

## Scripts
| Fichier | Contenu principal |
|---------|------------------|
| [`scripts/TROUBLESHOOTING.md`](scripts/TROUBLESHOOTING.md) | Diagnostic des scripts utilitaires : erreurs fréquentes et correctifs. |

---

## Bibliothèque README
| Fichier | Contenu principal |
|---------|------------------|
| [`readme-bibliotheque/README.md`](readme-bibliotheque/README.md) | Porte d’entrée de la bibliothèque centralisée des README. |
| [`readme-bibliotheque/racine.md`](readme-bibliotheque/racine.md) | README liés à la racine du projet. |
| [`readme-bibliotheque/backend.md`](readme-bibliotheque/backend.md) | README backend (tests, migrations, API). |
| [`readme-bibliotheque/frontend.md`](readme-bibliotheque/frontend.md) | README frontend (scripts, design system). |
| [`readme-bibliotheque/sources`](readme-bibliotheque/sources/) | Dossier contenant les versions source de chaque README. |

---

💡 **Astuce :** ajoutez immédiatement toute nouvelle fiche dans le dossier thématique approprié et mettez ce sommaire à jour pour conserver une documentation claire et vivante.
