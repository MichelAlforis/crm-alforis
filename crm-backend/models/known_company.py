"""
Modèle KnownCompany pour l'autofill intelligent
Table de référence des entreprises connues avec domaines, sites web, et LinkedIn
"""
from sqlalchemy import Column, Integer, String, Boolean, Float, TIMESTAMP
from sqlalchemy.sql import func
from core.database import Base


class KnownCompany(Base):
    """
    Table de référence des entreprises connues
    Utilisée pour résoudre automatiquement company_name + company_website depuis un email

    Exemples:
    - prenom.nom@mandarine-gestion.com → Mandarine Gestion + https://www.mandarine-gestion.com/
    - contact@sycomore-am.com → Sycomore Asset Management + https://www.sycomore-am.com/
    """
    __tablename__ = "known_companies"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Domaine unique (clé de recherche)
    domain = Column(String(255), nullable=False, unique=True, index=True,
                   comment="Domaine email sans www (ex: mandarine-gestion.com)")

    # Informations entreprise
    company_name = Column(String(255), nullable=False,
                         comment="Nom commercial de l'entreprise")
    company_website = Column(String(500), nullable=True,
                            comment="Site web officiel (avec https://)")
    company_linkedin = Column(String(500), nullable=True,
                             comment="Page LinkedIn entreprise")

    # Métadonnées
    industry = Column(String(100), nullable=True,
                     comment="Secteur d'activité")
    country_code = Column(String(2), nullable=True,
                         comment="Code pays ISO (FR, US, etc.)")

    # Qualité et provenance
    verified = Column(Boolean, server_default='false', nullable=False,
                     comment="Données vérifiées manuellement")
    confidence_score = Column(Float, server_default='0.8', nullable=False,
                             comment="Score de confiance (0.0-1.0)")
    source = Column(String(50), server_default='manual', nullable=False,
                   comment="Source: manual, linkedin, opencorporates, etc.")

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<KnownCompany(domain={self.domain}, name={self.company_name}, score={self.confidence_score})>"

    @property
    def is_personal_domain(self) -> bool:
        """Domaine email personnel (gmail, outlook, etc.) → confidence 0"""
        return self.confidence_score == 0.0

    @property
    def is_corporate_domain(self) -> bool:
        """Domaine d'entreprise légitime → confidence > 0"""
        return self.confidence_score > 0.0

    def to_dict(self):
        """Serialize pour API"""
        return {
            "id": self.id,
            "domain": self.domain,
            "company_name": self.company_name,
            "company_website": self.company_website,
            "company_linkedin": self.company_linkedin,
            "industry": self.industry,
            "country_code": self.country_code,
            "verified": self.verified,
            "confidence_score": self.confidence_score,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
