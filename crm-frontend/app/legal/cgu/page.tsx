import React from 'react'
import DownloadPDFButton from '@/components/legal/DownloadPDFButton'
import { PageContainer, PageHeader, PageTitle } from '@/components/shared'

export const metadata = {
  title: 'CGU - Conditions Générales d\'Utilisation | CRM Alforis',
  description: 'Conditions Générales d\'Utilisation du CRM Alforis Finance',
}

export default function CGUPage() {
  return (
    <PageContainer width="narrow">
      <PageHeader>
        <PageTitle subtitle="CRM Alforis Finance">
          CONDITIONS GÉNÉRALES D'UTILISATION
        </PageTitle>
        <p className="text-fluid-sm text-text-secondary mt-spacing-xs">
          Version : 1.0 – Mise à jour du 28 octobre 2025
        </p>
      </PageHeader>

      {/* Download Button */}
      <DownloadPDFButton
        documentType="cgu"
        title="Télécharger les CGU"
        description="Format PDF pour archivage"
      />

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none">

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Objet</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») encadrent l'accès et
              l'utilisation de la plateforme de gestion de la relation client « CRM Alforis Finance »
              (ci-après la « Plateforme ») éditée par :
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <p className="font-semibold text-gray-900">ALFORIS FINANCE</p>
              <p className="text-sm text-gray-700">SAS au capital de 5 000 €</p>
              <p className="text-sm text-gray-700">SIREN : 943 007 229</p>
              <p className="text-sm text-gray-700">Siège social : 10 rue de la Bourse – 75002 Paris</p>
              <p className="text-sm text-gray-700">Immatriculée au RNE le 07/02/2025</p>
              <p className="text-sm text-gray-700 mt-2">(ci-après « l'Editeur » ou « Alforis Finance »)</p>
            </div>
            <p className="text-gray-700 leading-relaxed">
              L'accès au service est réservé aux personnes autorisées par Alforis Finance, internes ou partenaires.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Description des Services</h2>
            <p className="text-gray-700 leading-relaxed mb-3">La Plateforme permet la gestion de :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>interactions commerciales et marketing</li>
              <li>organisations, contacts, actions, rendez-vous</li>
              <li>campagnes email et suivi des engagements</li>
              <li>indicateurs de performance et activités associées</li>
              <li>journalisation et sécurité des opérations utilisateurs</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Conditions d'accès</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              L'utilisateur déclare être habilité par Alforis Finance à utiliser la Plateforme.
              L'accès se fait au moyen d'identifiants strictement personnels.
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">L'utilisateur s'engage à :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>conserver ses identifiants secrets</li>
              <li>ne pas permettre à un tiers d'utiliser son accès</li>
              <li>signaler toute tentative d'accès frauduleux</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Propriété intellectuelle</h2>
            <p className="text-gray-700 leading-relaxed">
              L'ensemble du contenu (code logiciel, interface, logos, base de données) est protégé par
              le droit d'auteur et constitue la propriété exclusive d'Alforis Finance. Toute copie ou
              extraction non autorisée est interdite.
            </p>
          </section>

          {/* Section 5 - RGPD (Most Important) */}
          <section className="mb-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Données personnelles et RGPD</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Alforis Finance agit <strong>en qualité de Responsable du traitement</strong> au sens du RGPD.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">5.1 Données traitées</h3>
            <p className="text-gray-700 leading-relaxed mb-2">Sont concernées notamment :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-4">
              <li>Identité : nom, prénom, email, téléphone</li>
              <li>Données professionnelles : poste, entreprise, secteur</li>
              <li>Données de gestion client : interactions, rendez-vous</li>
              <li>Données marketing : historique emails, scoring</li>
              <li>Logs techniques : adresse IP, connexions, actions réalisées</li>
              <li>Toute donnée fournie par un utilisateur dans le cadre de la relation commerciale</li>
            </ul>
            <p className="text-sm text-gray-600 italic">
              Aucune donnée sensible au sens de l'article 9 RGPD n'est sollicitée ni conservée intentionnellement.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">5.2 Finalités</h3>
            <p className="text-gray-700 leading-relaxed">
              Gestion de la relation client, prospection commerciale B2B, marketing direct, suivi des activités,
              amélioration de la performance commerciale, sécurité des accès.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">5.3 Bases légales</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Exécution contractuelle</li>
              <li>Intérêt légitime à des fins de prospection professionnelle</li>
              <li>Obligation légale (devoir de conformité réglementaire)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">5.4 Conservation</h3>
            <p className="text-gray-700 leading-relaxed">
              Durée adaptée aux finalités et conforme aux obligations réglementaires sectorielles.
              Logs de sécurité conservés maximum 12 mois.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">5.5 Sous-traitants</h3>
            <p className="text-gray-700 leading-relaxed">
              Les données peuvent être hébergées et traitées par des prestataires informatiques européens
              ou offrant des garanties conformes à l'article 28 RGPD (ex : hébergeur, fournisseur emailing,
              support applicatif). La liste exhaustive est disponible sur demande.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">5.6 Droits des personnes</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              Accès, rectification, opposition, effacement, limitation, portabilité.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Contact : <a href="mailto:rgpd@alforis.fr" className="text-blue-600 hover:text-blue-800 underline">rgpd@alforis.fr</a>
            </p>
            <p className="text-gray-700 leading-relaxed">
              Réclamations : CNIL, <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">www.cnil.fr</a>
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Sécurité</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Alforis Finance met en œuvre des mesures techniques et organisationnelles conformes à l'état de l'art :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>gestion des habilitations</li>
              <li>journalisation des opérations sensibles</li>
              <li>cryptage des communications (HTTPS/TLS)</li>
              <li>sauvegardes régulières</li>
              <li>audits de sécurité périodiques</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Toute suspicion d'incident doit être signalée immédiatement à l'adresse sécurité communiquée par l'Editeur.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Obligations de l'utilisateur</h2>
            <p className="text-gray-700 leading-relaxed mb-3">L'utilisateur s'engage à :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>utiliser la Plateforme dans le respect des lois (dont RGPD, règles sectorielles financières)</li>
              <li>ne pas télécharger ni stocker de contenu illicite</li>
              <li>n'introduire aucun malware ou tentative de déstabilisation</li>
              <li>ne pas extraire les données sans autorisation</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Alforis Finance se réserve le droit de suspendre ou fermer tout compte en cas de violation.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Responsabilité</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Alforis Finance n'est responsable que des dommages directs et prévisibles imputables à une faute prouvée de sa part.
            </p>
            <p className="text-gray-700 leading-relaxed">
              La responsabilité est exclue pour les dommages indirects (perte de chiffre d'affaires, perte de données
              non sauvegardées par l'utilisateur, etc.).
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Disponibilité du service</h2>
            <p className="text-gray-700 leading-relaxed">
              La Plateforme est accessible 24h/24 sauf interruption planifiée pour maintenance ou en cas de force majeure.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Confidentialité</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Toutes les données et informations accessibles via la Plateforme sont confidentielles.
            </p>
            <p className="text-gray-700 leading-relaxed">
              L'utilisateur s'engage à ne pas les divulguer en dehors du cadre autorisé contractuellement.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Modification des CGU</h2>
            <p className="text-gray-700 leading-relaxed">
              Alforis Finance peut modifier les CGU si nécessaire. L'utilisateur sera informé de toute mise à jour substantielle.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Droit applicable et juridiction compétente</h2>
            <p className="text-gray-700 leading-relaxed">
              Les CGU sont régies par le droit français. Tout litige sera porté devant le Tribunal compétent du
              ressort de la Cour d'appel de Paris.
            </p>
          </section>

      </div>

      {/* Footer */}
      <div className="text-center">
        <a
          href="/dashboard"
          className="inline-flex items-center text-fluid-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Retour au CRM
        </a>
      </div>
    </PageContainer>
  )
}
