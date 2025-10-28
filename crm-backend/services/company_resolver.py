"""
CompanyResolver - Résolution automatique entreprise + site web depuis email
Utilisé par Autofill V2 pour déduire company_name, company_website, company_linkedin

Workflow:
1. Extraction domaine depuis email (ex: prenom.nom@mandarine-gestion.com → mandarine-gestion.com)
2. Lookup dans known_companies (seed + données enrichies)
3. Si non trouvé : HTTP probe (https://{domain}, https://www.{domain})
4. Retourne {company_name, company_website, company_linkedin, confidence, source}

Scoring:
- known_companies (verified=true): 1.0
- known_companies (verified=false): 0.75
- HTTP probe success: 0.6
- Domaine personnel (gmail, etc.): 0.0
"""
import re
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

try:
    import httpx
except ImportError:
    httpx = None  # Fallback si httpx non installé

from models.known_company import KnownCompany


class CompanyResolver:
    """
    Résout automatiquement les informations entreprise depuis un email
    """

    # Domaines personnels/publics à ignorer
    PERSONAL_DOMAINS = {
        'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.fr',
        'live.com', 'msn.com', 'me.com', 'icloud.com',
        'free.fr', 'orange.fr', 'wanadoo.fr', 'sfr.fr', 'laposte.net',
        'bbox.fr', 'numericable.fr', 'neuf.fr', 'aliceadsl.fr',
        'aol.com', 'protonmail.com', 'yandex.com', 'mail.ru',
    }

    def __init__(self, db: Session, http_timeout: int = 5):
        self.db = db
        self.http_timeout = http_timeout
        if httpx:
            self.http_client = httpx.Client(timeout=http_timeout, follow_redirects=True)
        else:
            self.http_client = None
            print("[CompanyResolver] httpx non disponible, HTTP probe désactivé")

    def extract_domain_from_email(self, email: str) -> Optional[str]:
        """
        Extrait le domaine depuis une adresse email

        Args:
            email: Adresse email (ex: prenom.nom@mandarine-gestion.com)

        Returns:
            Domaine sans www (ex: mandarine-gestion.com) ou None si invalide
        """
        if not email or '@' not in email:
            return None

        try:
            # Extract domain part after @
            domain = email.split('@')[1].strip().lower()

            # Remove www. if present
            if domain.startswith('www.'):
                domain = domain[4:]

            return domain if domain else None
        except (IndexError, AttributeError):
            return None

    def is_personal_domain(self, domain: str) -> bool:
        """Vérifie si le domaine est personnel (gmail, outlook, etc.)"""
        return domain.lower() in self.PERSONAL_DOMAINS

    def lookup_known_company(self, domain: str) -> Optional[Dict[str, Any]]:
        """
        Recherche dans la table known_companies

        Returns:
            Dict avec {company_name, company_website, company_linkedin, confidence, source}
            ou None si non trouvé
        """
        company = self.db.query(KnownCompany).filter(
            KnownCompany.domain == domain.lower()
        ).first()

        if not company:
            return None

        # Domaine personnel blacklisté
        if company.is_personal_domain:
            return {
                'company_name': None,
                'company_website': None,
                'company_linkedin': None,
                'confidence': 0.0,
                'source': 'known_companies_blacklist',
                'skip_company_autofill': True,  # Flag pour ne pas proposer company_name
            }

        return {
            'company_name': company.company_name,
            'company_website': company.company_website,
            'company_linkedin': company.company_linkedin,
            'confidence': company.confidence_score,
            'source': f'known_companies_{company.source}',
            'industry': company.industry,
            'country_code': company.country_code,
        }

    def http_probe_domain(self, domain: str) -> Optional[Dict[str, Any]]:
        """
        Vérifie si le domaine a un site web accessible
        Essaie https://{domain} puis https://www.{domain}

        Returns:
            Dict avec {company_website, confidence, source} si trouvé, None sinon
        """
        if not self.http_client or not httpx:
            return None  # HTTP probe désactivé

        variants = [
            f'https://{domain}',
            f'https://www.{domain}',
        ]

        for url in variants:
            try:
                response = self.http_client.get(url, timeout=self.http_timeout)
                if response.status_code == 200:
                    # Site trouvé, on peut au moins proposer le website
                    # company_name sera déduit du domaine (capitalisé)
                    company_name = self._domain_to_company_name(domain)

                    return {
                        'company_name': company_name,
                        'company_website': url,
                        'company_linkedin': None,
                        'confidence': 0.6,  # Moyenne confiance (site existe mais pas vérifié)
                        'source': 'http_probe',
                    }
            except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
                continue

        return None

    def _domain_to_company_name(self, domain: str) -> str:
        """
        Convertit un domaine en nom d'entreprise capitalisé
        Ex: mandarine-gestion.com → Mandarine Gestion
        """
        # Remove TLD
        name = domain.rsplit('.', 1)[0] if '.' in domain else domain

        # Replace hyphens and underscores with spaces
        name = name.replace('-', ' ').replace('_', ' ')

        # Capitalize each word
        name = ' '.join(word.capitalize() for word in name.split())

        return name

    def resolve(self, email: str) -> Dict[str, Any]:
        """
        Résout automatiquement les informations entreprise depuis un email

        Pipeline:
        1. Extraction domaine
        2. Vérification domaine personnel (blacklist)
        3. Lookup known_companies (priorité max)
        4. HTTP probe si non trouvé
        5. Retour vide si aucune résolution

        Args:
            email: Adresse email du contact

        Returns:
            Dict avec suggestions {company_name, company_website, company_linkedin, confidence, source}
        """
        # Step 1: Extract domain
        domain = self.extract_domain_from_email(email)
        if not domain:
            return {
                'company_name': None,
                'company_website': None,
                'company_linkedin': None,
                'confidence': 0.0,
                'source': 'no_domain',
            }

        # Step 2: Check if personal domain
        if self.is_personal_domain(domain):
            return {
                'company_name': None,
                'company_website': None,
                'company_linkedin': None,
                'confidence': 0.0,
                'source': 'personal_domain',
                'skip_company_autofill': True,
            }

        # Step 3: Lookup in known_companies (highest priority)
        known_result = self.lookup_known_company(domain)
        if known_result:
            return known_result

        # Step 4: HTTP probe as fallback
        probe_result = self.http_probe_domain(domain)
        if probe_result:
            # Optionnel: ajouter à known_companies pour prochaine fois
            self._save_discovered_company(domain, probe_result)
            return probe_result

        # Step 5: No resolution possible
        return {
            'company_name': None,
            'company_website': None,
            'company_linkedin': None,
            'confidence': 0.0,
            'source': 'not_found',
        }

    def _save_discovered_company(self, domain: str, info: Dict[str, Any]):
        """
        Sauvegarde une entreprise découverte via HTTP probe dans known_companies
        Pour réutilisation future
        """
        try:
            existing = self.db.query(KnownCompany).filter(
                KnownCompany.domain == domain
            ).first()

            if not existing:
                new_company = KnownCompany(
                    domain=domain,
                    company_name=info['company_name'],
                    company_website=info['company_website'],
                    company_linkedin=None,
                    industry=None,
                    country_code=None,
                    verified=False,  # Pas vérifié manuellement
                    confidence_score=0.6,  # HTTP probe confidence
                    source='http_probe_auto',
                )
                self.db.add(new_company)
                self.db.commit()
                print(f"[CompanyResolver] Saved new company: {domain} → {info['company_name']}")
        except Exception as e:
            print(f"[CompanyResolver] Error saving company {domain}: {e}")
            self.db.rollback()

    def __del__(self):
        """Cleanup HTTP client"""
        try:
            if self.http_client:
                self.http_client.close()
        except:
            pass
