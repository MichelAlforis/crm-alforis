"""
Service de génération de PDFs pour documents légaux.

Utilise ReportLab pour générer des PDFs professionnels avec:
- Mise en page propre
- Logo ALFORIS FINANCE
- Table des matières
- Numérotation de pages
- Headers/footers
"""

from io import BytesIO
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT


class LegalDocumentPDFGenerator:
    """Générateur de PDFs pour documents légaux (CGU, CGV, DPA, Privacy)."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Configure les styles personnalisés ALFORIS FINANCE."""
        # Style titre principal
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.styles["Heading1"],
                fontSize=24,
                textColor=colors.HexColor("#1e40af"),  # Blue-800
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName="Helvetica-Bold",
            )
        )

        # Style sous-titre
        self.styles.add(
            ParagraphStyle(
                name="CustomSubtitle",
                parent=self.styles["Heading2"],
                fontSize=14,
                textColor=colors.HexColor("#6b7280"),  # Gray-500
                spaceAfter=20,
                alignment=TA_CENTER,
            )
        )

        # Style section
        self.styles.add(
            ParagraphStyle(
                name="CustomHeading2",
                parent=self.styles["Heading2"],
                fontSize=16,
                textColor=colors.HexColor("#1f2937"),  # Gray-800
                spaceAfter=12,
                spaceBefore=20,
                fontName="Helvetica-Bold",
            )
        )

        # Style paragraphe
        self.styles.add(
            ParagraphStyle(
                name="CustomBody",
                parent=self.styles["BodyText"],
                fontSize=10,
                textColor=colors.HexColor("#374151"),  # Gray-700
                alignment=TA_JUSTIFY,
                spaceAfter=12,
                leading=14,
            )
        )

        # Style note
        self.styles.add(
            ParagraphStyle(
                name="CustomNote",
                parent=self.styles["BodyText"],
                fontSize=9,
                textColor=colors.HexColor("#6b7280"),  # Gray-500
                alignment=TA_LEFT,
                leftIndent=20,
                spaceAfter=10,
                leading=12,
                fontName="Helvetica-Oblique",
            )
        )

    def _add_header(self, canvas, doc):
        """Ajoute un header avec logo et titre."""
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 10)
        canvas.setFillColor(colors.HexColor("#1e40af"))
        canvas.drawString(2 * cm, A4[1] - 1.5 * cm, "ALFORIS FINANCE")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#6b7280"))
        canvas.drawString(2 * cm, A4[1] - 1.8 * cm, "SIREN: 943 007 229")
        canvas.restoreState()

    def _add_footer(self, canvas, doc):
        """Ajoute un footer avec numéro de page."""
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#9ca3af"))
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.drawRightString(A4[0] - 2 * cm, 1.5 * cm, text)
        canvas.drawString(
            2 * cm, 1.5 * cm, "ALFORIS FINANCE - 10 rue de la Bourse, 75002 Paris"
        )
        canvas.restoreState()

    def _first_page(self, canvas, doc):
        """Template pour la première page."""
        canvas.saveState()
        # Logo / Titre centré
        canvas.setFont("Helvetica-Bold", 28)
        canvas.setFillColor(colors.HexColor("#1e40af"))
        canvas.drawCentredString(A4[0] / 2, A4[1] - 4 * cm, "ALFORIS FINANCE")

        canvas.setFont("Helvetica", 10)
        canvas.setFillColor(colors.HexColor("#6b7280"))
        canvas.drawCentredString(A4[0] / 2, A4[1] - 4.7 * cm, "SAS au capital de 5 000 €")
        canvas.drawCentredString(
            A4[0] / 2, A4[1] - 5.2 * cm, "SIREN: 943 007 229"
        )
        canvas.drawCentredString(
            A4[0] / 2, A4[1] - 5.7 * cm, "10 rue de la Bourse – 75002 Paris"
        )

        # Footer minimal
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#9ca3af"))
        canvas.drawCentredString(
            A4[0] / 2, 1.5 * cm, "Document généré automatiquement – Version 1.0"
        )
        canvas.restoreState()

    def _later_pages(self, canvas, doc):
        """Template pour les pages suivantes."""
        self._add_header(canvas, doc)
        self._add_footer(canvas, doc)

    def generate_cgu_pdf(self) -> BytesIO:
        """Génère le PDF des CGU."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=3 * cm,
            bottomMargin=2.5 * cm,
        )

        story = []

        # Page de garde
        story.append(Spacer(1, 6 * cm))
        story.append(Paragraph("CONDITIONS GÉNÉRALES D'UTILISATION", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("Plateforme CRM ALFORIS", self.styles["CustomSubtitle"]))
        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(
                f"Version 1.0 – Mise à jour du {datetime.now().strftime('%d %B %Y')}",
                self.styles["CustomNote"],
            )
        )
        story.append(PageBreak())

        # Contenu CGU
        cgu_content = self._get_cgu_content()
        for section in cgu_content:
            story.append(Paragraph(section["title"], self.styles["CustomHeading2"]))
            for para in section["paragraphs"]:
                story.append(Paragraph(para, self.styles["CustomBody"]))
                story.append(Spacer(1, 0.3 * cm))
            story.append(Spacer(1, 0.5 * cm))

        # Build PDF
        doc.build(story, onFirstPage=self._first_page, onLaterPages=self._later_pages)
        buffer.seek(0)
        return buffer

    def generate_cgv_pdf(self) -> BytesIO:
        """Génère le PDF des CGV."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=3 * cm,
            bottomMargin=2.5 * cm,
        )

        story = []

        # Page de garde
        story.append(Spacer(1, 6 * cm))
        story.append(Paragraph("CONDITIONS GÉNÉRALES DE VENTE", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("Plateforme CRM ALFORIS", self.styles["CustomSubtitle"]))
        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(
                f"Version 1.0 – Mise à jour du {datetime.now().strftime('%d %B %Y')}",
                self.styles["CustomNote"],
            )
        )
        story.append(PageBreak())

        # Contenu CGV
        cgv_content = self._get_cgv_content()
        for section in cgv_content:
            story.append(Paragraph(section["title"], self.styles["CustomHeading2"]))
            for para in section["paragraphs"]:
                story.append(Paragraph(para, self.styles["CustomBody"]))
                story.append(Spacer(1, 0.3 * cm))
            story.append(Spacer(1, 0.5 * cm))

        # Build PDF
        doc.build(story, onFirstPage=self._first_page, onLaterPages=self._later_pages)
        buffer.seek(0)
        return buffer

    def generate_dpa_pdf(self) -> BytesIO:
        """Génère le PDF du DPA."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=3 * cm,
            bottomMargin=2.5 * cm,
        )

        story = []

        # Page de garde
        story.append(Spacer(1, 6 * cm))
        story.append(Paragraph("DATA PROCESSING AGREEMENT", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("Convention de Sous-Traitance RGPD", self.styles["CustomSubtitle"]))
        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(
                f"Version 1.0 – Mise à jour du {datetime.now().strftime('%d %B %Y')}",
                self.styles["CustomNote"],
            )
        )
        story.append(PageBreak())

        # Contenu DPA
        dpa_content = self._get_dpa_content()
        for section in dpa_content:
            story.append(Paragraph(section["title"], self.styles["CustomHeading2"]))
            for para in section["paragraphs"]:
                if isinstance(para, str):
                    story.append(Paragraph(para, self.styles["CustomBody"]))
                    story.append(Spacer(1, 0.3 * cm))
                elif isinstance(para, list):  # Table
                    story.append(self._create_table(para))
                    story.append(Spacer(1, 0.5 * cm))
            story.append(Spacer(1, 0.5 * cm))

        # Build PDF
        doc.build(story, onFirstPage=self._first_page, onLaterPages=self._later_pages)
        buffer.seek(0)
        return buffer

    def generate_privacy_pdf(self) -> BytesIO:
        """Génère le PDF de la Politique de Confidentialité."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=3 * cm,
            bottomMargin=2.5 * cm,
        )

        story = []

        # Page de garde
        story.append(Spacer(1, 6 * cm))
        story.append(Paragraph("POLITIQUE DE CONFIDENTIALITÉ", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("Protection des Données Personnelles (RGPD)", self.styles["CustomSubtitle"]))
        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(
                f"Version 1.0 – Mise à jour du {datetime.now().strftime('%d %B %Y')}",
                self.styles["CustomNote"],
            )
        )
        story.append(PageBreak())

        # Contenu Privacy Policy
        privacy_content = self._get_privacy_content()
        for section in privacy_content:
            story.append(Paragraph(section["title"], self.styles["CustomHeading2"]))
            for para in section["paragraphs"]:
                if isinstance(para, str):
                    story.append(Paragraph(para, self.styles["CustomBody"]))
                    story.append(Spacer(1, 0.3 * cm))
                elif isinstance(para, list):  # Table
                    story.append(self._create_table(para))
                    story.append(Spacer(1, 0.5 * cm))
            story.append(Spacer(1, 0.5 * cm))

        # Build PDF
        doc.build(story, onFirstPage=self._first_page, onLaterPages=self._later_pages)
        buffer.seek(0)
        return buffer

    def _create_table(self, data: list) -> Table:
        """Crée une table formatée."""
        table = Table(data, colWidths=[5 * cm, 5 * cm, 4 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                ]
            )
        )
        return table

    def _get_cgu_content(self):
        """Contenu structuré des CGU."""
        return [
            {
                "title": "1. Objet",
                "paragraphs": [
                    "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme CRM ALFORIS (ci-après « la Plateforme » ou « le Service »), éditée par ALFORIS FINANCE.",
                    "<b>Éditeur :</b> ALFORIS FINANCE – SAS au capital de 5 000 € – SIREN: 943 007 229 – Siège social: 10 rue de la Bourse, 75002 Paris, France.",
                    "En accédant à la Plateforme, l'Utilisateur reconnaît avoir pris connaissance des présentes CGU et s'engage à les respecter.",
                ],
            },
            {
                "title": "2. Description des Services",
                "paragraphs": [
                    "La Plateforme CRM ALFORIS propose les fonctionnalités suivantes :",
                    "• Gestion de contacts (particuliers et organisations)<br/>• Gestion d'interactions commerciales<br/>• Suivi de mandats et produits financiers<br/>• Campagnes marketing par email<br/>• Automatisation de workflows<br/>• Tableaux de bord et statistiques<br/>• Intégrations tierces (Microsoft Outlook, etc.)",
                    "Ces Services sont destinés exclusivement à un usage professionnel B2B dans le secteur du courtage en assurance et gestion de patrimoine.",
                ],
            },
            {
                "title": "3. Conditions d'accès",
                "paragraphs": [
                    "L'accès à la Plateforme requiert la création d'un compte utilisateur et l'acceptation des présentes CGU.",
                    "L'Utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants (email, mot de passe).",
                    "ALFORIS FINANCE se réserve le droit de suspendre ou supprimer tout compte en cas de violation des CGU, d'utilisation frauduleuse ou d'activités illicites.",
                ],
            },
            {
                "title": "4. Propriété intellectuelle",
                "paragraphs": [
                    "L'ensemble de la Plateforme (code source, design, logos, contenus) est protégé par le droit d'auteur et demeure la propriété exclusive d'ALFORIS FINANCE.",
                    "L'Utilisateur bénéficie d'un droit d'usage non exclusif et non transférable, limité à l'utilisation du Service conformément aux présentes CGU.",
                    "Toute reproduction, représentation, modification ou exploitation non autorisée est strictement interdite.",
                ],
            },
            {
                "title": "5. Données personnelles et RGPD",
                "paragraphs": [
                    "<b>Responsable du traitement :</b> ALFORIS FINANCE (SIREN 943 007 229).",
                    "<b>Données collectées :</b> identité (nom, prénom, email, téléphone), données professionnelles, interactions commerciales, logs de sécurité.",
                    "<b>Finalités :</b> fourniture du Service, gestion relation client, amélioration de la Plateforme, obligations légales (comptabilité, lutte anti-blanchiment si applicable).",
                    "<b>Base légale :</b> exécution du contrat (Article 6.1.b RGPD), intérêt légitime (Article 6.1.f RGPD), consentement pour marketing (Article 6.1.a RGPD).",
                    "<b>Vos droits :</b> Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition (Articles 15-22 RGPD). Pour exercer ces droits, contactez-nous à <b>rgpd@alforis.fr</b>.",
                    "<b>Durée de conservation :</b> Données clients actifs: durée de la relation contractuelle + 3 ans (prescription commerciale). Données inactives 18+ mois: anonymisation automatique.",
                    "<b>Hébergement :</b> Hetzner Online GmbH (Allemagne, UE) – Certifications ISO 27001, PCI-DSS.",
                    "<b>Sous-traitants :</b> Resend (emailing, USA – SCC), Sentry/DataDog (monitoring, UE/USA – SCC). Liste complète disponible dans notre DPA (Data Processing Agreement).",
                    "Pour plus de détails, consultez notre <b>Politique de Confidentialité</b> complète sur https://crm.alforis.fr/legal/privacy.",
                ],
            },
            {
                "title": "6. Sécurité",
                "paragraphs": [
                    "ALFORIS FINANCE met en œuvre des mesures de sécurité techniques et organisationnelles conformes à l'état de l'art (chiffrement TLS 1.3, hachage bcrypt, backups quotidiens, logs d'audit).",
                    "L'Utilisateur est responsable de la sécurité de ses identifiants. Nous recommandons l'utilisation de mots de passe forts et l'activation de l'authentification à deux facteurs (si disponible).",
                    "En cas de violation de données à caractère personnel, ALFORIS FINANCE notifiera la CNIL et les personnes concernées dans les délais légaux (Article 33-34 RGPD).",
                ],
            },
            {
                "title": "7. Obligations de l'Utilisateur",
                "paragraphs": [
                    "L'Utilisateur s'engage à :",
                    "• Utiliser la Plateforme conformément à la loi et aux présentes CGU<br/>• Ne pas tenter d'accéder à des données non autorisées (intrusion, piratage)<br/>• Ne pas perturber le fonctionnement du Service (DoS, injection SQL, XSS)<br/>• Ne pas revendre, sous-louer ou transférer son accès à des tiers sans autorisation",
                    "Toute violation entraînera la suspension immédiate du compte et pourra donner lieu à des poursuites judiciaires.",
                ],
            },
            {
                "title": "8. Responsabilité",
                "paragraphs": [
                    "ALFORIS FINANCE s'engage à fournir le Service avec diligence, mais ne garantit pas une disponibilité ininterrompue (maintenance, incidents techniques).",
                    "<b>Limitation de responsabilité :</b> En aucun cas ALFORIS FINANCE ne pourra être tenue responsable de dommages indirects (perte de données, manque à gagner, interruption d'activité) sauf faute lourde ou dol.",
                    "La responsabilité d'ALFORIS FINANCE est limitée au montant des sommes effectivement versées par l'Utilisateur au cours des 12 derniers mois.",
                    "ALFORIS FINANCE est couverte par une <b>assurance Responsabilité Civile Professionnelle (RC Pro)</b> conforme à l'activité d'édition SaaS.",
                ],
            },
            {
                "title": "9. Disponibilité du Service",
                "paragraphs": [
                    "Nous nous efforçons de maintenir une disponibilité maximale de la Plateforme. Un objectif de disponibilité de <b>99,5% sur base mensuelle</b> est visé (hors maintenance programmée).",
                    "Les maintenances programmées sont notifiées par email au moins 48h à l'avance. Les maintenances d'urgence (sécurité critique) peuvent être effectuées sans préavis.",
                    "En cas d'indisponibilité prolongée (>24h hors maintenance), l'Utilisateur peut demander un avoir proportionnel à la durée d'indisponibilité.",
                ],
            },
            {
                "title": "10. Confidentialité",
                "paragraphs": [
                    "ALFORIS FINANCE s'engage à respecter la confidentialité des données hébergées sur la Plateforme.",
                    "Nous ne communiquons aucune donnée à des tiers (sauf sous-traitants techniques listés dans le DPA) sans consentement préalable, sauf obligation légale (réquisition judiciaire, TRACFIN, etc.).",
                    "Un <b>Data Processing Agreement (DPA)</b> conforme à l'Article 28 RGPD est disponible sur demande pour les clients professionnels.",
                ],
            },
            {
                "title": "11. Modification des CGU",
                "paragraphs": [
                    "ALFORIS FINANCE se réserve le droit de modifier les présentes CGU à tout moment.",
                    "Les Utilisateurs seront informés par email des modifications substantielles au moins 30 jours avant leur entrée en vigueur.",
                    "L'utilisation continue de la Plateforme après notification vaut acceptation des nouvelles CGU. En cas de désaccord, l'Utilisateur peut résilier son compte.",
                ],
            },
            {
                "title": "12. Droit applicable et juridiction compétente",
                "paragraphs": [
                    "Les présentes CGU sont régies par le droit français.",
                    "Tout litige relatif à l'interprétation ou l'exécution des présentes sera soumis à la compétence exclusive des tribunaux de Paris (France).",
                    "Conformément à l'Article L.612-1 du Code de la consommation, l'Utilisateur peut recourir à une médiation conventionnelle ou à tout autre mode alternatif de règlement des différends (MARD).",
                ],
            },
        ]

    def _get_cgv_content(self):
        """Contenu structuré des CGV."""
        return [
            {
                "title": "1. Objet",
                "paragraphs": [
                    "Les présentes Conditions Générales de Vente (CGV) régissent la souscription et l'utilisation des services de la plateforme CRM ALFORIS, éditée par ALFORIS FINANCE.",
                    "<b>Vendeur :</b> ALFORIS FINANCE – SAS au capital de 5 000 € – SIREN: 943 007 229 – Siège social: 10 rue de la Bourse, 75002 Paris, France.",
                    "Les présentes CGV s'appliquent exclusivement aux ventes B2B (professionnels) et prévalent sur tout autre document.",
                ],
            },
            {
                "title": "2. Services proposés",
                "paragraphs": [
                    "ALFORIS FINANCE propose différents forfaits d'abonnement SaaS (Software as a Service) :",
                    "• <b>Forfait Solo</b> : 1 utilisateur, fonctionnalités de base<br/>• <b>Forfait Team</b> : jusqu'à 10 utilisateurs, workflows avancés<br/>• <b>Forfait Enterprise</b> : utilisateurs illimités, support prioritaire, DPA personnalisé",
                    "Les fonctionnalités détaillées de chaque forfait sont disponibles sur https://crm.alforis.fr/pricing (à créer si applicable).",
                ],
            },
            {
                "title": "3. Conditions financières",
                "paragraphs": [
                    "<b>Tarification :</b> Les tarifs sont indiqués en euros (EUR) hors taxes sur le site web et confirmés par devis ou bon de commande.",
                    "<b>TVA :</b> TVA française applicable (20%) sauf autoliquidation UE (Article 283-2 CGI) ou exonération hors UE.",
                    "<b>Paiement :</b> Prélèvement automatique mensuel ou annuel (SEPA, carte bancaire). Paiement par virement bancaire sur demande (entreprises >10 utilisateurs).",
                    "<b>Retard de paiement :</b> Tout retard entraîne l'application de pénalités de 3× le taux légal + indemnité forfaitaire de 40€ (Articles L.441-6 et D.441-5 Code de commerce).",
                ],
            },
            {
                "title": "4. Durée et résiliation",
                "paragraphs": [
                    "<b>Durée d'engagement :</b> Abonnement mensuel (sans engagement) ou annuel (avec engagement 12 mois, -15%).",
                    "<b>Résiliation :</b> Abonnement mensuel résiliable à tout moment avec préavis de 30 jours. Abonnement annuel résiliable à l'échéance (renouvellement tacite).",
                    "<b>Suspension pour défaut de paiement :</b> En cas d'impayé >15 jours, ALFORIS FINANCE se réserve le droit de suspendre l'accès au Service après mise en demeure restée infructueuse.",
                    "<b>Récupération des données :</b> L'Utilisateur dispose de 30 jours après résiliation pour exporter ses données via API ou interface. Passé ce délai, les données sont définitivement supprimées.",
                ],
            },
            {
                "title": "5. Hébergement et disponibilité",
                "paragraphs": [
                    "<b>Hébergeur :</b> Hetzner Online GmbH (Allemagne, UE) – Certifications ISO 27001, PCI-DSS.",
                    "<b>SLA (Service Level Agreement) :</b> Objectif de disponibilité de 99,5% sur base mensuelle (hors maintenance programmée).",
                    "<b>Backups :</b> Sauvegardes quotidiennes (rétention 30 jours). Sauvegardes incrémentielles toutes les 6h (rétention 7 jours).",
                    "<b>Maintenance :</b> Maintenance programmée notifiée 48h à l'avance, généralement entre 2h et 5h du matin (heure de Paris).",
                ],
            },
            {
                "title": "6. Support et assistance",
                "paragraphs": [
                    "<b>Support standard :</b> Email à support@alforis.fr – Délai de réponse: 48h ouvrées (lun-ven 9h-18h hors jours fériés).",
                    "<b>Support prioritaire (Forfait Enterprise) :</b> Délai de réponse: 4h ouvrées + accès téléphone.",
                    "<b>Documentation :</b> Base de connaissance en ligne accessible 24/7 sur https://docs.alforis.fr (si applicable).",
                ],
            },
            {
                "title": "7. Propriété intellectuelle",
                "paragraphs": [
                    "L'ensemble du code source, design, logos et contenus de la Plateforme demeure la propriété exclusive d'ALFORIS FINANCE.",
                    "L'Utilisateur bénéficie d'une licence d'utilisation non exclusive, non cessible, révocable à la résiliation du contrat.",
                    "Les données saisies par l'Utilisateur (contacts, interactions) demeurent sa propriété exclusive. ALFORIS FINANCE s'engage à ne pas les exploiter à des fins commerciales.",
                ],
            },
            {
                "title": "8. Données personnelles – RGPD",
                "paragraphs": [
                    "Le traitement des données personnelles est régi par :",
                    "• <b>CGU</b> (Section 5) : https://crm.alforis.fr/legal/cgu<br/>• <b>Politique de Confidentialité</b> : https://crm.alforis.fr/legal/privacy<br/>• <b>DPA (Data Processing Agreement)</b> : https://crm.alforis.fr/legal/dpa",
                    "Contact DPO: <b>rgpd@alforis.fr</b>.",
                ],
            },
            {
                "title": "9. Obligations du Client",
                "paragraphs": [
                    "Le Client s'engage à :",
                    "• Utiliser le Service conformément à la législation en vigueur (RGPD, LCB-FT si applicable)<br/>• Obtenir les consentements nécessaires pour le traitement de données personnelles (si prospection B2C)<br/>• Ne pas utiliser le Service pour envoyer du spam, du phishing ou tout contenu illicite<br/>• Respecter les quotas d'envoi d'emails (selon forfait)",
                    "En cas de violation, ALFORIS FINANCE se réserve le droit de suspendre immédiatement le Service et de résilier le contrat sans remboursement.",
                ],
            },
            {
                "title": "10. Limitation de responsabilité",
                "paragraphs": [
                    "ALFORIS FINANCE ne pourra être tenue responsable de :",
                    "• Force majeure (catastrophe naturelle, cyberattaque d'ampleur nationale, panne généralisée des infrastructures cloud)<br/>• Faute du Client (mauvaise utilisation, violation des CGU, négligence dans la sécurisation des identifiants)<br/>• Dommages indirects (perte de chiffre d'affaires, manque à gagner, atteinte à l'image)",
                    "La responsabilité totale d'ALFORIS FINANCE est plafonnée au montant des sommes versées par le Client au cours des 12 derniers mois.",
                    "ALFORIS FINANCE dispose d'une <b>assurance Responsabilité Civile Professionnelle (RC Pro)</b> couvrant l'activité d'éditeur SaaS.",
                ],
            },
            {
                "title": "11. Confidentialité",
                "paragraphs": [
                    "ALFORIS FINANCE s'engage à ne divulguer aucune information confidentielle du Client à des tiers, sauf :",
                    "• Sous-traitants techniques listés dans le DPA (Hetzner, Resend, Sentry/DataDog)<br/>• Obligation légale (réquisition judiciaire, TRACFIN, CNIL)",
                    "Cette obligation de confidentialité demeure valable 5 ans après la résiliation du contrat.",
                ],
            },
            {
                "title": "12. Réversibilité",
                "paragraphs": [
                    "À la résiliation du contrat, le Client dispose de <b>30 jours</b> pour :",
                    "• Exporter toutes ses données au format JSON, CSV ou via API REST<br/>• Télécharger une archive complète (fichiers joints, logs)",
                    "ALFORIS FINANCE fournit gratuitement une assistance technique pour l'export des données (durée maximale: 4h).",
                    "Passé ce délai de 30 jours, les données sont définitivement supprimées et ne pourront plus être récupérées.",
                ],
            },
            {
                "title": "13. Force majeure",
                "paragraphs": [
                    "Aucune des Parties ne sera responsable d'un retard ou d'une inexécution résultant d'un cas de force majeure au sens de l'Article 1218 du Code civil.",
                    "Exemples: catastrophe naturelle, guerre, émeute, cyberattaque d'ampleur nationale (ex: panne AWS généralisée), décision gouvernementale (ex: coupure Internet nationale).",
                    "Si la force majeure persiste plus de 90 jours, chaque Partie pourra résilier le contrat de plein droit sans indemnité.",
                ],
            },
            {
                "title": "14. Droit applicable",
                "paragraphs": [
                    "Les présentes CGV sont régies par le droit français.",
                    "Tout litige sera soumis à la compétence exclusive des tribunaux de commerce de Paris (France).",
                ],
            },
            {
                "title": "15. Signature électronique",
                "paragraphs": [
                    "L'acceptation des présentes CGV peut se faire par :",
                    "• Validation électronique (checkbox) lors de la souscription en ligne<br/>• Signature manuscrite d'un bon de commande<br/>• Signature électronique qualifiée (DocuSign, Yousign) pour les contrats Enterprise",
                    "Conformément à l'Article 1366 du Code civil et au Règlement eIDAS, la signature électronique a la même valeur juridique qu'une signature manuscrite.",
                ],
            },
        ]

    def _get_dpa_content(self):
        """Contenu structuré du DPA."""
        return [
            {
                "title": "1. Objet",
                "paragraphs": [
                    "Le présent Data Processing Agreement (DPA) a pour objet de définir les conditions dans lesquelles le Sous-Traitant traite des données à caractère personnel pour le compte d'ALFORIS FINANCE dans le cadre de la plateforme CRM ALFORIS.",
                ],
            },
            {
                "title": "2. Description du traitement",
                "paragraphs": [
                    "<b>Finalités :</b> Gestion relation clients, interactions commerciales, campagnes marketing, sécurité des accès.",
                    "<b>Catégories de données :</b> Identité (nom, prénom, email, téléphone), données professionnelles (fonction, société, interactions), marketing (tracking email, scoring), logs de connexion et sécurité.",
                    "<b>Personnes concernées :</b> Prospects B2B, clients, partenaires, utilisateurs internes.",
                    "<b>Durée :</b> Durée contractuelle + obligations légales (3 ans pour comptabilité, archivage RGPD).",
                ],
            },
            {
                "title": "3. Obligations du Sous-Traitant",
                "paragraphs": [
                    "Le Sous-Traitant s'engage à :",
                    "1. Ne traiter les données que sur instructions d'ALFORIS FINANCE<br/>2. Garantir la confidentialité du personnel habilité<br/>3. Mettre en œuvre des mesures de sécurité adaptées (chiffrement TLS 1.3, hachage bcrypt, backups quotidiens)<br/>4. Assister ALFORIS FINANCE dans la gestion des droits RGPD (accès, rectification, effacement, portabilité)<br/>5. Documenter et notifier sans délai toute violation de données (<24h à la CNIL)<br/>6. Supprimer ou restituer intégralement les données en fin de contrat",
                ],
            },
            {
                "title": "4. Sous-traitance ultérieure",
                "paragraphs": [
                    "Le Sous-Traitant ne fait appel à aucun sous-traitant tiers sans autorisation écrite préalable d'ALFORIS FINANCE.",
                    "Sous-traitants autorisés à ce jour :",
                    [
                        ["Service", "Prestataire", "Localisation"],
                        ["Hébergement applicatif", "Hetzner Online GmbH", "🇪🇺 UE (DE)"],
                        ["Email marketing", "Resend", "🇺🇸 USA (SCC)"],
                        ["Logs & monitoring", "Sentry / DataDog", "🇪🇺 / 🇺🇸 (SCC)"],
                    ],
                    "Toute modification fera l'objet d'une mise à jour notifiée.",
                ],
            },
            {
                "title": "5. Localisation des données",
                "paragraphs": [
                    "Les données sont hébergées au sein de l'Union Européenne (Hetzner, Allemagne).",
                    "Tout transfert hors UE est strictement encadré par: Clauses Contractuelles Types (SCC) ou Décision d'adéquation de la Commission européenne.",
                ],
            },
            {
                "title": "6. Audits",
                "paragraphs": [
                    "ALFORIS FINANCE peut mener 1 audit/an ou en cas d'incident grave.",
                    "Coûts à la charge du Sous-Traitant si non-conformité constatée.",
                ],
            },
            {
                "title": "7. Sort des données",
                "paragraphs": [
                    "À la fin de la prestation, le Sous-Traitant doit :",
                    "• Effacer totalement les données ou<br/>• Les restituer sur support sécurisé<br/>• Fournir un certificat d'effacement si demandé",
                ],
            },
            {
                "title": "8. Responsabilité",
                "paragraphs": [
                    "Le Sous-Traitant répond de toute violation avérée de sécurité ou de confidentialité imputable à sa négligence.",
                    "Sanctions RGPD applicables: jusqu'à 10M€ ou 2% du CA mondial (Article 83 RGPD).",
                ],
            },
            {
                "title": "9. Droit applicable",
                "paragraphs": [
                    "Droit français. Tribunal compétent: Paris.",
                ],
            },
        ]

    def _get_privacy_content(self):
        """Contenu structuré de la Politique de Confidentialité."""
        return [
            {
                "title": "1. Responsable du traitement",
                "paragraphs": [
                    "<b>Identité :</b> ALFORIS FINANCE – SAS au capital de 5 000 € – SIREN: 943 007 229",
                    "<b>Adresse :</b> 10 rue de la Bourse, 75002 Paris, France",
                    "<b>Contact DPO :</b> rgpd@alforis.fr",
                ],
            },
            {
                "title": "2. Données personnelles collectées",
                "paragraphs": [
                    "Nous collectons les catégories de données suivantes :",
                    "• <b>Identité :</b> Nom, prénom, email, téléphone<br/>• <b>Données professionnelles :</b> Fonction, société, interactions commerciales<br/>• <b>Marketing :</b> Tracking email (ouvertures, clics), scoring<br/>• <b>Sécurité :</b> Logs de connexion, adresse IP, user-agent",
                ],
            },
            {
                "title": "3. Finalités du traitement",
                "paragraphs": [
                    "Vos données sont traitées pour les finalités suivantes :",
                    [
                        ["Finalité", "Base légale", "Durée"],
                        ["Fourniture du Service CRM", "Contrat (Art 6.1.b)", "Durée contrat + 3 ans"],
                        ["Gestion relation client", "Intérêt légitime (Art 6.1.f)", "Durée contrat + 3 ans"],
                        ["Campagnes marketing", "Consentement (Art 6.1.a)", "Jusqu'à retrait"],
                        ["Sécurité & logs", "Intérêt légitime (Art 6.1.f)", "12 mois"],
                        ["Obligations légales", "Obligation légale (Art 6.1.c)", "Variable (3-10 ans)"],
                    ],
                ],
            },
            {
                "title": "4. Destinataires des données",
                "paragraphs": [
                    "Vos données peuvent être transmises aux catégories de destinataires suivants :",
                    [
                        ["Destinataire", "Finalité", "Localisation"],
                        ["Personnel ALFORIS FINANCE", "Gestion du Service", "🇫🇷 France"],
                        ["Hetzner Online GmbH", "Hébergement", "🇪🇺 UE (DE)"],
                        ["Resend", "Email marketing", "🇺🇸 USA (SCC)"],
                        ["Sentry / DataDog", "Monitoring", "🇪🇺 / 🇺🇸 (SCC)"],
                    ],
                ],
            },
            {
                "title": "5. Transferts hors UE",
                "paragraphs": [
                    "Certains sous-traitants sont situés hors Union Européenne (Resend - USA).",
                    "Ces transferts sont encadrés par des <b>Clauses Contractuelles Types (SCC)</b> approuvées par la Commission européenne (Décision 2021/914).",
                    "Vous pouvez obtenir une copie des SCC en contactant rgpd@alforis.fr.",
                ],
            },
            {
                "title": "6. Durée de conservation",
                "paragraphs": [
                    "Vos données sont conservées pour les durées suivantes :",
                    [
                        ["Catégorie", "Durée", "Justification"],
                        ["Comptes actifs", "Durée contrat + 3 ans", "Prescription commerciale"],
                        ["Comptes inactifs 18+ mois", "Anonymisation auto", "Conformité RGPD"],
                        ["Logs de sécurité", "12 mois", "Intérêt légitime"],
                        ["Comptabilité", "10 ans", "Code de commerce"],
                    ],
                ],
            },
            {
                "title": "7. Vos droits RGPD",
                "paragraphs": [
                    "Vous disposez des droits suivants :",
                    "• <b>Droit d'accès (Article 15)</b> : Obtenir une copie de vos données<br/>• <b>Droit de rectification (Article 16)</b> : Corriger vos données inexactes<br/>• <b>Droit à l'effacement (Article 17)</b> : Supprimer vos données (sous conditions)<br/>• <b>Droit à la limitation (Article 18)</b> : Geler temporairement le traitement<br/>• <b>Droit à la portabilité (Article 20)</b> : Récupérer vos données au format JSON/CSV<br/>• <b>Droit d'opposition (Article 21)</b> : Refuser un traitement (marketing, profilage)",
                    "Pour exercer ces droits, contactez-nous à <b>rgpd@alforis.fr</b> (réponse sous 1 mois).",
                    "Vous pouvez également introduire une réclamation auprès de la CNIL: https://www.cnil.fr/fr/plaintes",
                ],
            },
            {
                "title": "8. Cookies et traceurs",
                "paragraphs": [
                    "Notre site utilise des cookies strictement nécessaires au fonctionnement (session, authentification) et des cookies analytiques (avec votre consentement).",
                    "Vous pouvez gérer vos préférences cookies via les paramètres de votre navigateur.",
                ],
            },
            {
                "title": "9. Sécurité des données",
                "paragraphs": [
                    "Nous mettons en œuvre les mesures de sécurité suivantes :",
                    "• Chiffrement TLS 1.3 (transport) et AES-256 (stockage tokens)<br/>• Hachage bcrypt pour mots de passe (coût 12)<br/>• Backups quotidiens (rétention 30 jours)<br/>• Logs d'audit (traçabilité accès et modifications)<br/>• Monitoring 24/7 (Sentry, DataDog)<br/>• Tests de sécurité réguliers (pentests annuels recommandés)",
                ],
            },
            {
                "title": "10. Modifications de la politique",
                "paragraphs": [
                    "Nous nous réservons le droit de modifier cette Politique de Confidentialité.",
                    "Toute modification substantielle sera notifiée par email 30 jours avant son entrée en vigueur.",
                    "Dernière mise à jour: " + datetime.now().strftime("%d %B %Y"),
                ],
            },
            {
                "title": "11. Contact et réclamations",
                "paragraphs": [
                    "<b>Contact DPO :</b> rgpd@alforis.fr",
                    "<b>Réclamation CNIL :</b> https://www.cnil.fr/fr/plaintes",
                    "<b>Téléphone :</b> (à compléter si applicable)",
                ],
            },
        ]
