import React from 'react'

export const metadata = {
  title: 'Politique de Confidentialité | CRM Alforis',
  description: 'Protection des données personnelles - CRM Alforis Finance conforme RGPD',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            POLITIQUE DE CONFIDENTIALITÉ
          </h1>
          <p className="text-lg text-gray-600">CRM Alforis Finance</p>
          <p className="text-sm text-gray-500 mt-2">
            Version : 1.0 – Mise à jour du 28 octobre 2025
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
            <span>🔒</span>
            <span>Conforme RGPD (Articles 13 et 14)</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 prose prose-sm max-w-none">

          {/* Introduction */}
          <section className="mb-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded">
            <p className="text-gray-700 leading-relaxed mb-3">
              La présente Politique de Confidentialité décrit comment <strong>ALFORIS FINANCE</strong> collecte,
              utilise et protège vos données personnelles dans le cadre de l'utilisation du CRM Alforis Finance.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Nous nous engageons à respecter votre vie privée et à protéger vos données conformément au
              Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Responsable du Traitement</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <p className="font-semibold text-gray-900">ALFORIS FINANCE</p>
              <p className="text-sm text-gray-700">SAS au capital de 5 000 €</p>
              <p className="text-sm text-gray-700">SIREN : 943 007 229</p>
              <p className="text-sm text-gray-700">Siège social : 10 rue de la Bourse – 75002 Paris</p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Contact RGPD :</strong> <a href="mailto:rgpd@alforis.fr" className="text-blue-600 hover:underline">rgpd@alforis.fr</a>
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm mt-3">
              ALFORIS FINANCE agit en qualité de <strong>Responsable du traitement</strong> au sens de l'Article 4.7 du RGPD
              pour les données personnelles collectées via le CRM.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Données Personnelles Collectées</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">2.1 Données d'Identification</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Nom et prénom</li>
              <li>Adresse email professionnelle</li>
              <li>Numéro de téléphone</li>
              <li>Fonction / Poste</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">2.2 Données Professionnelles</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Entreprise / Organisation</li>
              <li>Secteur d'activité</li>
              <li>Historique des interactions commerciales</li>
              <li>Notes et commentaires relatifs à la relation client</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">2.3 Données de Navigation et Connexion</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Adresse IP</li>
              <li>Type de navigateur (user agent)</li>
              <li>Logs de connexion (date, heure, actions réalisées)</li>
              <li>Cookies techniques (session, authentification)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">2.4 Données Marketing</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Historique des campagnes emails (envois, ouvertures, clics)</li>
              <li>Scoring et qualification (lead scoring)</li>
              <li>Préférences de communication</li>
            </ul>

            <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded mt-4 italic">
              ℹ️ <strong>Données sensibles :</strong> Nous ne collectons aucune donnée sensible au sens de l'Article 9 du RGPD
              (origine raciale, opinions politiques, données de santé, etc.).
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Finalités du Traitement</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vos données personnelles sont collectées et traitées pour les finalités suivantes :
            </p>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-400 pl-4">
                <h4 className="font-semibold text-gray-900">Gestion de la Relation Client (CRM)</h4>
                <p className="text-sm text-gray-600">
                  Base légale : Exécution du contrat (Article 6.1.b RGPD)
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Suivi des interactions, gestion des rendez-vous, historique commercial, support client.
                </p>
              </div>

              <div className="border-l-4 border-green-400 pl-4">
                <h4 className="font-semibold text-gray-900">Prospection Commerciale B2B</h4>
                <p className="text-sm text-gray-600">
                  Base légale : Intérêt légitime (Article 6.1.f RGPD)
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Envoi de communications commerciales aux professionnels (newsletters, offres, événements).
                </p>
              </div>

              <div className="border-l-4 border-purple-400 pl-4">
                <h4 className="font-semibold text-gray-900">Sécurité et Prévention de la Fraude</h4>
                <p className="text-sm text-gray-600">
                  Base légale : Intérêt légitime (Article 6.1.f RGPD)
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Journalisation des accès, détection d'anomalies, protection des données.
                </p>
              </div>

              <div className="border-l-4 border-orange-400 pl-4">
                <h4 className="font-semibold text-gray-900">Amélioration du Produit</h4>
                <p className="text-sm text-gray-600">
                  Base légale : Consentement (Article 6.1.a RGPD) - optionnel
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Analyse d'usage anonymisée pour améliorer les fonctionnalités (si analytics activé).
                </p>
              </div>

              <div className="border-l-4 border-red-400 pl-4">
                <h4 className="font-semibold text-gray-900">Obligations Légales et Réglementaires</h4>
                <p className="text-sm text-gray-600">
                  Base légale : Obligation légale (Article 6.1.c RGPD)
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Conservation des données pour répondre aux obligations comptables, fiscales et sectorielles.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Destinataires des Données</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vos données personnelles peuvent être transmises aux catégories de destinataires suivantes :
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.1 Personnel Autorisé ALFORIS FINANCE</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Accès strictement limité aux collaborateurs habilités (équipes commerciales, support technique, direction)
              dans le cadre de leurs fonctions.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.2 Sous-Traitants (Article 28 RGPD)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Prestataire</th>
                    <th className="px-4 py-2 text-left font-semibold">Service</th>
                    <th className="px-4 py-2 text-left font-semibold">Localisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2">Hetzner Online GmbH</td>
                    <td className="px-4 py-2">Hébergement infrastructure</td>
                    <td className="px-4 py-2">🇪🇺 Allemagne (UE)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Resend</td>
                    <td className="px-4 py-2">Envoi emails transactionnels</td>
                    <td className="px-4 py-2">🇺🇸 USA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Sentry / DataDog</td>
                    <td className="px-4 py-2">Monitoring & logs</td>
                    <td className="px-4 py-2">🇪🇺 UE / 🇺🇸 USA (SCC)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-2 italic">
              SCC = Clauses Contractuelles Types (garanties RGPD pour transferts hors UE)
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.3 Autorités Légales</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Communication de données sur réquisition judiciaire uniquement (obligation légale).
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Transferts Hors Union Européenne</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Principe :</strong> Nos données sont hébergées au sein de l'Union Européenne (Hetzner - Allemagne).
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Exceptions :</strong> Certains sous-traitants peuvent être localisés hors UE (ex: Resend - USA).
              Dans ce cas, nous mettons en place des garanties appropriées :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Clauses Contractuelles Types (SCC)</strong> approuvées par la Commission européenne</li>
              <li><strong>Data Privacy Framework (DPF)</strong> pour les prestataires certifiés USA-UE</li>
              <li><strong>Décisions d'adéquation</strong> de la Commission (pays reconnus conformes RGPD)</li>
            </ul>
            <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded mt-4">
              📋 Liste complète des sous-traitants disponible sur demande : <a href="mailto:rgpd@alforis.fr" className="underline">rgpd@alforis.fr</a>
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Durée de Conservation</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Catégorie de Données</th>
                    <th className="px-4 py-2 text-left font-semibold">Durée de Conservation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2">Compte utilisateur actif</td>
                    <td className="px-4 py-2">Durée du contrat + 1 an (prescription)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Données CRM (contacts, interactions)</td>
                    <td className="px-4 py-2">Durée relation commerciale + 3 ans</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Logs de connexion</td>
                    <td className="px-4 py-2">12 mois (sécurité)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Logs d'activité RGPD (audit)</td>
                    <td className="px-4 py-2">3 ans (conformité)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Données anonymisées</td>
                    <td className="px-4 py-2">Illimité (statistiques agrégées)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-3 italic">
              ⚠️ Contacts inactifs depuis 18 mois et sans consentement RGPD sont automatiquement anonymisés.
            </p>
          </section>

          {/* Section 7 - VOS DROITS (IMPORTANT) */}
          <section className="mb-8 bg-green-50 border-2 border-green-500 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Vos Droits (RGPD - Chapitre III)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Conformément aux Articles 15 à 22 du RGPD, vous disposez des droits suivants :
            </p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-2xl">👁️</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit d'Accès (Article 15)</h4>
                  <p className="text-sm text-gray-700">
                    Obtenir une copie de vos données personnelles et informations sur leur traitement.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-2xl">✏️</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit de Rectification (Article 16)</h4>
                  <p className="text-sm text-gray-700">
                    Corriger ou compléter vos données inexactes ou incomplètes.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-2xl">🗑️</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit à l'Effacement (Article 17)</h4>
                  <p className="text-sm text-gray-700">
                    Demander la suppression de vos données (sous réserve obligations légales).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-2xl">⏸️</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit à la Limitation (Article 18)</h4>
                  <p className="text-sm text-gray-700">
                    Limiter temporairement le traitement de vos données (gel).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-2xl">🚫</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit d'Opposition (Article 21)</h4>
                  <p className="text-sm text-gray-700">
                    Vous opposer au traitement pour prospection commerciale (opt-out).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-2xl">📦</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit à la Portabilité (Article 20)</h4>
                  <p className="text-sm text-gray-700">
                    Récupérer vos données dans un format structuré (JSON, CSV).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Droit de Réclamation</h4>
                  <p className="text-sm text-gray-700">
                    Introduire une réclamation auprès de la CNIL (autorité de contrôle française).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white border border-green-300 rounded p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Comment exercer vos droits ?</h4>
              <p className="text-sm text-gray-700 mb-2">
                Vous pouvez exercer vos droits à tout moment en nous contactant :
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>📧 <strong>Email :</strong> <a href="mailto:rgpd@alforis.fr" className="text-blue-600 hover:underline">rgpd@alforis.fr</a></li>
                <li>🔗 <strong>Interface CRM :</strong> Section "Mon Compte" → "Confidentialité & RGPD"</li>
                <li>✉️ <strong>Courrier :</strong> ALFORIS FINANCE - DPO, 10 rue de la Bourse, 75002 Paris</li>
              </ul>
              <p className="text-xs text-gray-600 mt-3 italic">
                Délai de réponse : <strong>1 mois</strong> à compter de la réception de votre demande
                (extensible à 3 mois si complexité).
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Cookies et Traceurs</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">8.1 Cookies Strictement Nécessaires (Exemptés de Consentement)</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Ces cookies sont indispensables au fonctionnement du CRM :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 text-sm">
              <li><code className="bg-gray-100 px-1 py-0.5 rounded">session_id</code> - Gestion de la session utilisateur (durée: navigation)</li>
              <li><code className="bg-gray-100 px-1 py-0.5 rounded">auth_token</code> - Authentification sécurisée (durée: 7 jours)</li>
              <li><code className="bg-gray-100 px-1 py-0.5 rounded">csrf_token</code> - Protection contre les attaques CSRF</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">8.2 Cookies Analytics (Consentement Requis)</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Si activé : mesure d'audience anonymisée (Google Analytics, Matomo, etc.).
            </p>
            <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded">
              ℹ️ Consentement demandé via bandeau cookies conforme CNIL lors de votre première visite.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">8.3 Gestion des Cookies</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Vous pouvez gérer vos préférences cookies :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 text-sm">
              <li>Via le bandeau cookies (bouton "Personnaliser")</li>
              <li>Via les paramètres de votre navigateur (bloquer/supprimer cookies)</li>
              <li>Durée de conservation : 13 mois maximum (réglementation CNIL)</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Sécurité des Données</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ALFORIS FINANCE met en œuvre des mesures techniques et organisationnelles conformes à l'état de l'art :
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🔐</span> Chiffrement
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• HTTPS/TLS 1.3 (communications)</li>
                  <li>• Bcrypt/Argon2 (mots de passe)</li>
                  <li>• AES-256 (données au repos)</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>👥</span> Contrôle d'Accès
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Authentification JWT sécurisée</li>
                  <li>• RBAC (rôles et permissions)</li>
                  <li>• 2FA optionnel (authentification forte)</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>💾</span> Sauvegarde
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Backups quotidiens automatiques</li>
                  <li>• Rétention 30 jours</li>
                  <li>• Tests de restauration mensuels</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>📊</span> Surveillance
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Logs d'accès et modifications</li>
                  <li>• Détection anomalies (Sentry)</li>
                  <li>• Alertes temps réel</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-red-700 bg-red-50 p-3 rounded mt-4">
              🚨 <strong>Violation de données :</strong> En cas d'incident de sécurité, nous notifions la CNIL sous 72h
              et vous informons si vos droits sont susceptibles d'être affectés (Article 33-34 RGPD).
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Modifications de la Politique</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              ALFORIS FINANCE se réserve le droit de modifier cette Politique de Confidentialité si nécessaire
              (évolutions légales, nouvelles fonctionnalités, etc.).
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>En cas de modification substantielle :</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Notification par email aux utilisateurs actifs</li>
              <li>Affichage popup lors de la prochaine connexion</li>
              <li>Publication de la nouvelle version avec date de mise à jour</li>
              <li>Archivage des versions précédentes (transparence)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3 italic">
              Nous vous encourageons à consulter régulièrement cette page pour rester informé.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Contact et Réclamations</h2>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Questions ou Demandes RGPD</h4>
              <p className="text-sm text-gray-700 mb-2">
                Pour toute question sur cette politique ou l'exercice de vos droits :
              </p>
              <p className="text-sm text-gray-700">
                📧 <a href="mailto:rgpd@alforis.fr" className="text-blue-600 hover:underline font-semibold">rgpd@alforis.fr</a>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                ✉️ ALFORIS FINANCE - DPO, 10 rue de la Bourse, 75002 Paris
              </p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Réclamation CNIL</h4>
              <p className="text-sm text-gray-700 mb-2">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
                auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
              </p>
              <p className="text-sm text-gray-700">
                🌐 <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  www.cnil.fr/fr/plaintes
                </a>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                ✉️ CNIL - 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07
              </p>
              <p className="text-sm text-gray-700 mt-1">
                📞 +33 (0)1 53 73 22 22
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Retour au CRM
          </a>
        </div>
      </div>
    </div>
  )
}
