"""
Routes API pour documents légaux (CGU, CGV, DPA, Privacy Policy).

Endpoints:
- GET /api/v1/legal/documents/{document_type}/pdf - Télécharger PDF d'un document légal
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Literal

from services.pdf_generator import LegalDocumentPDFGenerator

router = APIRouter(prefix="/legal", tags=["legal"])


@router.get("/documents/{document_type}/pdf")
async def download_legal_document_pdf(
    document_type: Literal["cgu", "cgv", "dpa", "privacy"]
) -> StreamingResponse:
    """
    Télécharge le PDF d'un document légal.

    Args:
        document_type: Type de document (cgu, cgv, dpa, privacy)

    Returns:
        StreamingResponse: PDF téléchargeable

    Raises:
        HTTPException 400: Type de document invalide
        HTTPException 500: Erreur génération PDF
    """
    try:
        generator = LegalDocumentPDFGenerator()

        # Génération du PDF selon le type
        if document_type == "cgu":
            pdf_buffer = generator.generate_cgu_pdf()
            filename = "CGU_Alforis_Finance.pdf"
            title = "Conditions Générales d'Utilisation"
        elif document_type == "cgv":
            pdf_buffer = generator.generate_cgv_pdf()
            filename = "CGV_Alforis_Finance.pdf"
            title = "Conditions Générales de Vente"
        elif document_type == "dpa":
            pdf_buffer = generator.generate_dpa_pdf()
            filename = "DPA_Alforis_Finance.pdf"
            title = "Data Processing Agreement"
        elif document_type == "privacy":
            pdf_buffer = generator.generate_privacy_pdf()
            filename = "Privacy_Policy_Alforis_Finance.pdf"
            title = "Politique de Confidentialité"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Type de document invalide: {document_type}. Valeurs acceptées: cgu, cgv, dpa, privacy",
            )

        # Headers pour téléchargement
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "X-Document-Title": title,
        }

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers=headers,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du PDF: {str(e)}",
        )


@router.get("/documents/available")
async def list_available_legal_documents():
    """
    Liste tous les documents légaux disponibles en téléchargement.

    Returns:
        dict: Liste des documents avec métadonnées
    """
    return {
        "documents": [
            {
                "type": "cgu",
                "title": "Conditions Générales d'Utilisation",
                "description": "Régit l'accès et l'utilisation de la plateforme CRM ALFORIS",
                "version": "1.0",
                "pdf_url": "/api/v1/legal/documents/cgu/pdf",
                "web_url": "/legal/cgu",
            },
            {
                "type": "cgv",
                "title": "Conditions Générales de Vente",
                "description": "Conditions commerciales pour la souscription des forfaits SaaS",
                "version": "1.0",
                "pdf_url": "/api/v1/legal/documents/cgv/pdf",
                "web_url": "/legal/cgv",
            },
            {
                "type": "dpa",
                "title": "Data Processing Agreement",
                "description": "Convention de sous-traitance RGPD (Article 28)",
                "version": "1.0",
                "pdf_url": "/api/v1/legal/documents/dpa/pdf",
                "web_url": "/legal/dpa",
            },
            {
                "type": "privacy",
                "title": "Politique de Confidentialité",
                "description": "Protection des données personnelles (Articles 13/14 RGPD)",
                "version": "1.0",
                "pdf_url": "/api/v1/legal/documents/privacy/pdf",
                "web_url": "/legal/privacy",
            },
        ],
        "company": {
            "name": "ALFORIS FINANCE",
            "legal_form": "SAS au capital de 5 000 €",
            "siren": "943 007 229",
            "address": "10 rue de la Bourse, 75002 Paris, France",
            "dpo_contact": "rgpd@alforis.fr",
        },
    }
