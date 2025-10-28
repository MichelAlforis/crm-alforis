import React from 'react'
import DownloadPDFButton from '@/components/legal/DownloadPDFButton'

export const metadata = {
  title: 'CGV - Conditions Générales de Vente | CRM Alforis',
  description: 'Conditions Générales de Vente du CRM Alforis Finance',
}

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CONDITIONS GÉNÉRALES DE VENTE
          </h1>
          <p className="text-lg text-gray-600">ALFORIS FINANCE – CRM Alforis</p>
          <p className="text-sm text-gray-500 mt-2">
            Version : 1.0 – Mise à jour du 28 octobre 2025
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
            <span>📋</span>
            <span>SaaS B2B</span>
          </div>
        </div>

        {/* Download Button */}
        <DownloadPDFButton
          documentType="cgv"
          title="Télécharger les CGV"
          description="Format PDF pour signature client"
          className="mb-6"
        />

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 prose prose-sm max-w-none">

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Objet</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Les présentes Conditions Générales de Vente (ci-après « CGV ») définissent les modalités de
              commercialisation et d'utilisation du logiciel CRM « Alforis » édité par :
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <p className="font-semibold text-gray-900">ALFORIS FINANCE</p>
              <p className="text-sm text-gray-700">SAS au capital de 5 000 €</p>
              <p className="text-sm text-gray-700">SIREN : 943 007 229</p>
              <p className="text-sm text-gray-700">Siège social : 10 rue de la Bourse – 75002 Paris</p>
              <p className="text-sm text-gray-700 mt-2">(ci-après « Alforis Finance » ou « l'Éditeur »)</p>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Tout devis ou bon de commande signé implique l'adhésion sans réserve aux présentes CGV.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Description du Service SaaS</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le CRM Alforis est un logiciel de gestion de la relation client accessible en mode SaaS, incluant notamment :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Gestion organisations, prospects, clients, interactions</li>
              <li>Campagnes email & suivi des engagements</li>
              <li>Reporting & KPIs commerciaux</li>
              <li>Gestion des rendez-vous et activités</li>
              <li>Sécurité des accès & journalisation</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3 italic">
              Le périmètre exact du Service figure au devis ou contrat commercial.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Conditions financières</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">3.1 Prix</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              Les prix s'entendent <strong>hors taxes</strong> et sont indiqués au devis :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Abonnement mensuel/annuel par licence ou pack utilisateurs</li>
              <li>Services complémentaires : paramétrage, formation, support avancé</li>
              <li>Développement spécifique (sur devis séparé)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">3.2 Révision des prix</h3>
            <p className="text-gray-700 leading-relaxed">
              Les prix peuvent être révisés <strong>annuellement</strong>, dans la limite de l'indice Syntec + 3 points maximum.
              La révision est notifiée 30 jours avant application.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">3.3 Paiement</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              Facturation <strong>à la commande puis périodique</strong> selon l'échéancier prévu.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Paiement par virement sous <strong>30 jours fin de mois</strong>.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">3.4 Retard de paiement</h3>
            <p className="text-gray-700 leading-relaxed">
              Pénalités légales + 40 € indemnité forfaitaire frais de recouvrement (art. L441-10 C. com).
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Durée – Résiliation</h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">4.1 Durée</h3>
            <p className="text-gray-700 leading-relaxed">
              Contrat à durée déterminée <strong>12 mois</strong>, renouvelé tacitement par périodes de même durée.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.2 Résiliation</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Résiliation par LRAR avec <strong>préavis 60 jours</strong> avant échéance.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              En cas de faute grave de l'une des parties, résiliation possible <strong>après mise en demeure
              restée sans effet sous 15 jours</strong>.
            </p>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded">
              ⚠️ Aucune restitution des sommes déjà versées en cas de résiliation anticipée par le client.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Accès au Service – Hébergement</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Service disponible <strong>24h/24</strong>, hors maintenance programmée.
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
              Alforis Finance met en œuvre l'état de l'art :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Hébergement européen sécurisé (Hetzner - Allemagne)</li>
              <li>Chiffrement TLS 1.3</li>
              <li>Sauvegardes régulières</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Support & maintenance</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Support standard :</strong> du lundi au vendredi, 9h-18h (Paris) par email{' '}
              <a href="mailto:support@alforis.fr" className="text-blue-600 hover:underline">support@alforis.fr</a>.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Correctifs, mises à jour et évolutions inclus dans l'abonnement.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Fonctionnalités supplémentaires : sur devis.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Propriété intellectuelle</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le CRM et ses composants restent <strong>propriété exclusive</strong> d'Alforis Finance.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Aucun droit de copie, de modification, ni de rétro-ingénierie n'est accordé.
            </p>
            <p className="text-green-700 bg-green-50 p-3 rounded font-semibold">
              ✅ Le Client demeure <strong>propriétaire de ses données</strong>.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Données personnelles – RGPD</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Alforis Finance agit comme <strong>Responsable de traitement</strong> pour les comptes utilisateur
              et <strong>Sous-traitant</strong> pour les données CRM.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              La conformité RGPD est encadrée par :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><a href="/legal/cgu" className="text-blue-600 hover:underline font-semibold">CGU (Conditions Générales d'Utilisation)</a></li>
              <li><a href="/legal/dpa" className="text-blue-600 hover:underline font-semibold">DPA complet + Annexes</a> (Data Processing Agreement)</li>
              <li><a href="/legal/privacy" className="text-blue-600 hover:underline font-semibold">Politique de Confidentialité</a></li>
            </ul>
            <p className="text-sm text-purple-700 mt-3 font-semibold">
              Ces documents constituent une <strong>partie intégrante</strong> des présentes CGV.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Obligations du Client</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le Client s'engage à :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Utiliser le Service conformément aux lois et à la réglementation financière applicable</li>
              <li>Protéger ses accès et habilitations utilisateurs</li>
              <li>Ne pas intégrer de données illicites ou contraires au secret professionnel</li>
            </ul>
            <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded mt-3">
              ⚠️ Toute suspicion de faille doit être signalée immédiatement.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Limitations de responsabilité</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Responsabilité Alforis limitée aux dommages <strong>directs</strong> démontrés,{' '}
              <strong>dans la limite du montant total annuel</strong> facturé au titre du contrat.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Exclusions :</strong> pertes de chance, perte de chiffre d'affaires, préjudice commercial indirect.
            </p>
            <p className="text-sm text-gray-600 italic">
              Aucune exclusion n'est applicable en cas de manquement volontaire à la sécurité ou à la confidentialité
              des données par Alforis Finance.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Confidentialité</h2>
            <p className="text-gray-700 leading-relaxed">
              Chaque Partie s'engage à ne pas divulguer les informations confidentielles reçues dans le cadre du
              contrat pendant <strong>5 ans</strong> après sa fin.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Réversibilité & restitution des données</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              À l'expiration du contrat :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Restitution des données sous format standard (CSV/JSON) <strong>sur demande écrite</strong></li>
              <li>Accessible pendant 30 jours après la date de fin</li>
              <li>Suppression définitive au-delà, avec certificat sur simple demande</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3 italic">
              Option de réversibilité assistée : sur devis.
            </p>
          </section>

          {/* Section 13 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">13. Force majeure</h2>
            <p className="text-gray-700 leading-relaxed">
              Les obligations sont suspendues en cas de force majeure (art. 1218 C. civ.), après notification.
            </p>
          </section>

          {/* Section 14 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">14. Références commerciales</h2>
            <p className="text-gray-700 leading-relaxed">
              Sauf opposition écrite, Alforis Finance peut citer le nom et le logo du Client comme référence commerciale.
            </p>
          </section>

          {/* Section 15 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">15. Droit applicable – Juridiction</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Droit applicable :</strong> Droit français
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Tribunal compétent :</strong> Paris
            </p>
          </section>

          {/* Signature Section */}
          <section className="mb-8 bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">SIGNATURE</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Pour ALFORIS FINANCE</h3>
                <p className="text-sm text-gray-700">Nom : Michel Marques</p>
                <p className="text-sm text-gray-700">Fonction : Président</p>
                <p className="text-sm text-gray-700 mt-2">Date : …/…/20…</p>
                <div className="mt-4 h-16 border-b-2 border-gray-400">
                  <p className="text-xs text-gray-500">Signature :</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Pour le Client</h3>
                <p className="text-sm text-gray-700">Nom : [ ]</p>
                <p className="text-sm text-gray-700">Fonction : [ ]</p>
                <p className="text-sm text-gray-700 mt-2">Date : …/…/20…</p>
                <div className="mt-4 h-16 border-b-2 border-gray-400">
                  <p className="text-xs text-gray-500">Signature :</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="/legal"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium mr-6"
          >
            ← Documents Légaux
          </a>
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
