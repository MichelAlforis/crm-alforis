#!/usr/bin/env python3
"""
Script pour générer les métadonnées TypeScript des 60 nouveaux templates (IDs 41-100)
"""

# Métadonnées pour templates 41-100
templates_metadata = [
    # APPELS / RÉUNIONS (41-46)
    (41, 'appels', ['preparation', 'checklist', 'decouverte'], ['Préparer calls découverte'], 'facile', 5, None, '📞'),
    (42, 'appels', ['relance', 'multi-tentatives', 'persistance'], ['Suivre prospects difficiles à joindre'], 'intermediaire', 10, None, '📞'),
    (43, 'reunions', ['debriefing', 'compte-rendu', 'bant'], ['Standardiser process post-réunion'], 'facile', 5, 'Webhook meeting_completed', '📅'),
    (44, 'reunions', ['rappel', 'visio', 'confirmation'], ['Confirmer RDV avec lien visio'], 'facile', 3, None, '📅'),
    (45, 'reunions', ['escalade', 'annulation', 'urgence'], ['Gérer annulations dernière minute'], 'intermediaire', 10, None, '⚠️'),
    (46, 'appels', ['courtoisie', 'satisfaction', 'post-signature'], ['Maintenir relation post-vente'], 'facile', 5, None, '☎️'),

    # MAILING / NEWSLETTERS (47-52)
    (47, 'mailing', ['segmentation', 'preparation', 'rgpd'], ['Préparer campagnes newsletter'], 'intermediaire', 15, None, '📧'),
    (48, 'mailing', ['ab-testing', 'analyse', 'optimisation'], ['Optimiser campagnes email'], 'avance', 20, None, '📊'),
    (49, 'mailing', ['relance', 'non-ouvert', 'engagement'], ['Améliorer taux ouverture'], 'facile', 5, None, '📨'),
    (50, 'mailing', ['nettoyage', 'bounces', 'hygiene'], ['Maintenir qualité base emails'], 'facile', 10, None, '🧹'),
    (51, 'mailing', ['scoring', 'engagement', 'segmentation'], ['Prioriser contacts engagés'], 'intermediaire', 15, None, '🎯'),
    (52, 'mailing', ['winback', 'reactivation', 'churned'], ['Réactiver clients perdus'], 'intermediaire', 15, None, '🔄'),

    # RELATIONS CLIENT (53-58)
    (53, 'relations', ['onboarding', 'j30', 'satisfaction'], ['Valider onboarding client'], 'facile', 5, None, '✅'),
    (54, 'relations', ['churn', 'alerte', 'retention'], ['Prévenir pertes clients'], 'avance', 20, None, '🚨'),
    (55, 'relations', ['upsell', 'usage', 'upgrade'], ['Détecter opportunités upsell'], 'intermediaire', 10, None, '⬆️'),
    (56, 'relations', ['nps', 'detracteur', 'urgence'], ['Traiter détracteurs NPS'], 'avance', 15, None, '🚨'),
    (57, 'relations', ['celebration', 'milestone', 'success'], ['Célébrer succès clients'], 'facile', 5, None, '🎉'),
    (58, 'relations', ['fidelite', 'paliers', 'programme'], ['Gérer programme fidélité'], 'intermediaire', 10, None, '⭐'),

    # PROSPECTION / LEADS (59-65)
    (59, 'prospection', ['qualification', 'bant', 'checklist'], ['Qualifier leads méthodique'], 'facile', 5, None, '✔️'),
    (60, 'prospection', ['nurturing', 'maturation', 'lead-froid'], ['Maturer leads non qualifiés'], 'intermediaire', 10, None, '🌱'),
    (61, 'prospection', ['lead-chaud', 'scoring', 'priorite'], ['Action rapide leads chauds'], 'intermediaire', 5, None, '🔥'),
    (62, 'prospection', ['classification', 'source', 'tagging'], ['Identifier sources leads'], 'facile', 3, None, '🏷️'),
    (63, 'prospection', ['linkedin', 'reseau', 'social-selling'], ['Gérer prospection LinkedIn'], 'intermediaire', 10, 'Intégration LinkedIn', '💼'),
    (64, 'prospection', ['evenement', 'salon', 'followup'], ['Suivre leads événements'], 'facile', 5, None, '🎪'),
    (65, 'prospection', ['round-robin', 'affectation', 'equitable'], ['Distribuer leads équitablement'], 'facile', 5, None, '🔄'),

    # REPORTING / PILOTAGE (66-70)
    (66, 'reporting', ['dashboard', 'temps-reel', 'kpis'], ['Suivre KPIs en temps réel'], 'intermediaire', 10, None, '📊'),
    (67, 'reporting', ['objectifs', 'alerte', 'mensuel'], ['Alertes objectifs mensuels'], 'facile', 5, None, '🎯'),
    (68, 'reporting', ['forecast', 'previsions', 'pipeline'], ['Actualiser prévisions CA'], 'intermediaire', 15, None, '📈'),
    (69, 'reporting', ['analyse', 'echecs', 'amelioration'], ['Analyser deals perdus'], 'avance', 20, None, '📉'),
    (70, 'reporting', ['manager', 'equipe', 'performance'], ['Piloter performance équipe'], 'intermediaire', 10, None, '👥'),

    # CONTRATS / MANDATS (71-78)
    (71, 'contrats', ['preparation', 'accord-verbal', 'documents'], ['Préparer contrats rapidement'], 'intermediaire', 15, None, '📄'),
    (72, 'contrats', ['signature', 'electronique', 'relance'], ['Accélérer signatures'], 'facile', 5, None, '✍️'),
    (73, 'contrats', ['renouvellement', 'j-60', 'anticipation'], ['Anticiper renouvellements'], 'intermediaire', 10, None, '🔄'),
    (74, 'contrats', ['avenant', 'modification', 'validation'], ['Gérer avenants contractuels'], 'intermediaire', 15, None, '📝'),
    (75, 'contrats', ['resiliation', 'urgence', 'retention'], ['Traiter résiliations'], 'avance', 20, None, '🚨'),
    (76, 'contrats', ['archivage', 'expiration', 'classement'], ['Archiver contrats expirés'], 'facile', 10, None, '📦'),
    (77, 'contrats', ['conditions-speciales', 'validation', 'exception'], ['Valider conditions hors-standard'], 'avance', 15, None, '⚠️'),
    (78, 'contrats', ['commissions', 'calcul', 'automatique'], ['Calculer commissions auto'], 'intermediaire', 10, None, '💰'),

    # CONFORMITÉ / RGPD (79-84)
    (79, 'conformite', ['rgpd', 'consentements', 'annuel'], ['Revalider consentements'], 'intermediaire', 15, None, '🔒'),
    (80, 'conformite', ['dsar', 'acces-donnees', 'droit-personne'], ['Traiter demandes RGPD'], 'avance', 20, 'DPO désigné', '📋'),
    (81, 'conformite', ['purge', 'inactifs', 'suppression'], ['Nettoyer données inactives'], 'intermediaire', 15, None, '🧹'),
    (82, 'conformite', ['audit-trail', 'tracabilite', 'logging'], ['Tracer modifications'], 'intermediaire', 10, None, '📝'),
    (83, 'conformite', ['desabonnement', 'opt-out', 'marketing'], ['Gérer désabonnements'], 'facile', 5, None, '🚫'),
    (84, 'conformite', ['rapport', 'trimestriel', 'dpo'], ['Rapports conformité'], 'intermediaire', 15, 'DPO désigné', '📊'),

    # COLLABORATION INTERNE (85-90)
    (85, 'collaboration', ['passation', 'transfert', 'dossier'], ['Transférer dossiers'], 'intermediaire', 15, None, '🔄'),
    (86, 'collaboration', ['support-technique', 'escalade', 'expertise'], ['Escalader questions techniques'], 'facile', 5, None, '🛠️'),
    (87, 'collaboration', ['validation', 'remise', 'manager'], ['Valider remises > 15%'], 'intermediaire', 10, None, '✅'),
    (88, 'collaboration', ['partage', 'best-practice', 'learning'], ['Partager succès équipe'], 'facile', 10, None, '🎓'),
    (89, 'collaboration', ['review', 'compte-strategique', 'trimestriel'], ['Reviewer comptes clés'], 'intermediaire', 20, None, '📋'),
    (90, 'collaboration', ['absence', 'backup', 'continuite'], ['Gérer absences longues'], 'intermediaire', 15, None, '🔄'),

    # PARTENARIATS / RÉSEAU (91-95)
    (91, 'partenariats', ['onboarding', 'partenaire', 'formation'], ['Accueillir nouveaux partenaires'], 'intermediaire', 15, None, '🤝'),
    (92, 'partenariats', ['recommandation', 'apporteur', 'suivi'], ['Suivre leads partenaires'], 'facile', 5, None, '🎁'),
    (93, 'partenariats', ['commissions', 'apporteur', 'calcul'], ['Rémunérer apporteurs'], 'intermediaire', 10, None, '💰'),
    (94, 'partenariats', ['temoignage', 'case-study', 'marketing'], ['Récolter témoignages'], 'intermediaire', 15, None, '⭐'),
    (95, 'partenariats', ['evenement', 'networking', 'invitation'], ['Organiser événements réseau'], 'intermediaire', 20, None, '🎉'),

    # FORMATION / ONBOARDING (96-100)
    (96, 'formation', ['formation-client', 'onboarding', 'produit'], ['Former nouveaux clients'], 'intermediaire', 15, None, '🎓'),
    (97, 'formation', ['webinar', 'prospects', 'demonstration'], ['Organiser webinars'], 'intermediaire', 20, None, '🖥️'),
    (98, 'formation', ['progression', 'evaluation', 'competences'], ['Suivre progression formation'], 'intermediaire', 10, None, '📈'),
    (99, 'formation', ['ressources', 'self-service', 'autonomie'], ['Partager ressources'], 'facile', 5, None, '📚'),
    (100, 'formation', ['certification', 'avance', 'expertise'], ['Certifier utilisateurs'], 'avance', 20, None, '🏆'),
]

# Générer le code TypeScript
print('// Métadonnées templates 41-100 (60 nouveaux templates Finance B2B)')
print()
for id, cat, tags, usecases, diff, time, prereq, icon in templates_metadata:
    print(f"  {id}: {{")
    print(f"    category: '{cat}',")
    print(f"    tags: {tags},")
    print(f"    useCases: {usecases},")
    print(f"    difficulty: '{diff}',")
    print(f"    estimatedSetupTime: {time},")
    if prereq:
        print(f"    prerequisites: '{prereq}',")
    print(f"    icon: '{icon}',")
    print(f"  }},")
