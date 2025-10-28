import React from 'react'

export const metadata = {
  title: 'DPA - Data Processing Agreement | CRM Alforis',
  description: 'Convention de Sous-Traitance RGPD - CRM Alforis Finance',
}

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DATA PROCESSING AGREEMENT (DPA)
          </h1>
          <p className="text-lg text-gray-600">Convention de Sous-Traitance RGPD</p>
          <p className="text-sm text-gray-500 mt-2">
            Version : 1.0 – Mise à jour du 28 octobre 2025
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
              <span>🔒</span>
              <span>Article 28 RGPD</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
              <span>🇪🇺</span>
              <span>Données UE</span>
            </span>
          </div>
        </div>

        {/* Download Button */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Télécharger le DPA</p>
              <p className="text-xs text-gray-600 mt-1">Format PDF prêt à signer</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              📥 Télécharger PDF
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 prose prose-sm max-w-none">

          {/* Parties */}
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              Ce document fait partie intégrante des relations entre :
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-gray-900">ALFORIS FINANCE</p>
              <p className="text-sm text-gray-700">SAS au capital de 5 000 €</p>
              <p className="text-sm text-gray-700">SIREN : 943 007 229</p>
              <p className="text-sm text-gray-700">10 rue de la Bourse – 75002 Paris – France</p>
              <p className="text-sm text-gray-700 mt-2">(ci-après « le Responsable du traitement » ou « Alforis Finance »)</p>
            </div>

            <p className="text-center text-gray-600 my-4">et</p>

            <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
              <p className="font-semibold text-gray-900">[Nom du Sous-Traitant]</p>
              <p className="text-sm text-gray-700">[SIREN / Adresse du siège / Pays]</p>
              <p className="text-sm text-gray-700 mt-2">(ci-après « le Sous-Traitant »)</p>
            </div>

            <p className="text-sm text-gray-600 mt-4 italic">
              Dénommés ensemble « les Parties ».
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Objet</h2>
            <p className="text-gray-700 leading-relaxed">
              Le présent DPA a pour objet de définir les conditions dans lesquelles le Sous-Traitant traite
              des données à caractère personnel pour le compte d'Alforis Finance dans le cadre de la plate-forme
              CRM « Alforis ».
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Description du traitement</h2>

            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Finalités :</strong> gestion relation clients, interactions commerciales, campagnes marketing,
              sécurité des accès.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">Catégories de données :</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Identité (nom, prénom, email, téléphone)</li>
              <li>Données professionnelles (fonction, société, interactions)</li>
              <li>Marketing (tracking email, scoring)</li>
              <li>Logs de connexion et sécurité</li>
            </ul>

            <p className="text-gray-700 leading-relaxed mt-4 mb-2">
              <strong>Personnes concernées :</strong> prospects B2B, clients, partenaires, utilisateurs internes.
            </p>

            <p className="text-gray-700 leading-relaxed">
              <strong>Durée :</strong> durée contractuelle + obligations légales.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Obligations du Sous-Traitant</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le Sous-Traitant s'engage à :
            </p>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>Ne traiter les données <strong>que</strong> sur instructions d'Alforis Finance.</li>
              <li>Garantir la <strong>confidentialité</strong> du personnel habilité.</li>
              <li>Mettre en œuvre des <strong>mesures de sécurité adaptées</strong>.</li>
              <li>Assister Alforis Finance dans la <strong>gestion des droits RGPD</strong>.</li>
              <li>Documenter et notifier <strong>sans délai</strong> toute violation de données (&lt;24h).</li>
              <li>Supprimer ou restituer <strong>intégralement</strong> les données en fin de contrat.</li>
            </ol>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Sous-traitance ultérieure</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le Sous-Traitant ne fait appel à aucun sous-traitant tiers <strong>sans autorisation écrite préalable</strong> d'Alforis Finance.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">Sous-traitants autorisés à ce jour :</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Service</th>
                    <th className="px-4 py-2 text-left font-semibold">Prestataire</th>
                    <th className="px-4 py-2 text-left font-semibold">Localisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2">Hébergement applicatif</td>
                    <td className="px-4 py-2">Hetzner Online GmbH</td>
                    <td className="px-4 py-2">🇪🇺 UE (DE)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Email marketing</td>
                    <td className="px-4 py-2">Resend</td>
                    <td className="px-4 py-2">🇺🇸 USA (SCC en place)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Logs & monitoring</td>
                    <td className="px-4 py-2">Sentry / DataDog</td>
                    <td className="px-4 py-2">🇪🇺 / 🇺🇸 (SCC si hors UE)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-600 mt-3 italic">
              Toute modification fera l'objet d'une mise à jour notifiée.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Localisation des données</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Les données sont <strong>hébergées au sein de l'Union Européenne</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
              Tout transfert hors UE est strictement encadré par :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Clauses Contractuelles Types (SCC) ou</li>
              <li>Décision d'adéquation de la Commission européenne</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Audits</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Alforis Finance peut mener <strong>1 audit/an</strong> ou en cas d'incident grave.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Coûts à la charge du Sous-Traitant si non-conformité constatée.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Sort des données</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              À la fin de la prestation, le Sous-Traitant doit :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>effacer totalement les données <strong>ou</strong></li>
              <li>les restituer sur support sécurisé</li>
              <li>fournir <strong>certificat d'effacement</strong> si demandé</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Responsabilité</h2>
            <p className="text-gray-700 leading-relaxed">
              Le Sous-Traitant répond de toute violation avérée de sécurité ou de confidentialité imputable
              à sa négligence.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Droit applicable</h2>
            <p className="text-gray-700 leading-relaxed">
              Droit français. Tribunal compétent : Paris.
            </p>
          </section>

          {/* Annexes Notice */}
          <section className="mb-8 bg-orange-50 border-l-4 border-orange-500 p-6 rounded">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📎 ANNEXES (partie intégrante du DPA)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le DPA complet comprend 5 annexes détaillées :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Annexe 1</strong> – Registre des traitements sous-traités</li>
              <li><strong>Annexe 2</strong> – Politique de gestion des habilitations</li>
              <li><strong>Annexe 3</strong> – Cartographie des flux de données</li>
              <li><strong>Annexe 4</strong> – Plan de réponse aux incidents</li>
              <li><strong>Annexe 5</strong> – Évaluation des sous-traitants</li>
            </ul>
            <p className="text-sm text-orange-700 mt-4">
              📥 Téléchargez le <strong>PDF complet avec annexes</strong> via le bouton en haut de page.
            </p>
          </section>

          {/* Signature Section */}
          <section className="mb-8 bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Signatures</h2>

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
                <h3 className="font-semibold text-gray-900 mb-3">Pour [Nom du Sous-Traitant]</h3>
                <p className="text-sm text-gray-700">Nom : [ ]</p>
                <p className="text-sm text-gray-700">Fonction : [ ]</p>
                <p className="text-sm text-gray-700 mt-2">Date : …/…/20…</p>
                <div className="mt-4 h-16 border-b-2 border-gray-400">
                  <p className="text-xs text-gray-500">Signature :</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6 text-center italic">
              ✅ Ce document est opérationnel immédiatement. Utilisable pour Hetzner, Resend, ou tout prestataire à venir.
            </p>
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
