"""
Service NLP pour extraction d'entités depuis les emails.

Utilise spaCy avec le modèle français fr_core_news_lg pour extraire:
- Noms de personnes (PER)
- Noms d'organisations (ORG)
- Lieux (LOC)
- Dates (DATE)
- Numéros de téléphone
- Adresses email

Installation du modèle:
    python -m spacy download fr_core_news_lg
"""

import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

import spacy
from spacy.language import Language

logger = logging.getLogger(__name__)


class EmailNLPService:
    """Service NLP pour enrichir les données extraites depuis les emails."""

    def __init__(self):
        self.nlp: Optional[Language] = None
        self._load_model()

    def _load_model(self):
        """
        Charge le modèle spaCy français.

        Si le modèle n'est pas installé, le service continue sans NLP
        (mode dégradé).
        """
        try:
            logger.info("🧠 Chargement du modèle spaCy fr_core_news_lg...")
            self.nlp = spacy.load("fr_core_news_lg")
            logger.info("✅ Modèle spaCy chargé avec succès")
        except OSError:
            logger.warning(
                "⚠️  Modèle spaCy fr_core_news_lg non installé. "
                "Exécutez: python -m spacy download fr_core_news_lg"
            )
            self.nlp = None
        except Exception as e:
            logger.error(f"❌ Erreur lors du chargement du modèle spaCy: {e}")
            self.nlp = None

    def is_available(self) -> bool:
        """Vérifie si le service NLP est disponible."""
        return self.nlp is not None

    def extract_entities(self, text: str) -> Dict[str, Any]:
        """
        Extrait les entités nommées depuis un texte.

        Args:
            text: Texte à analyser (corps d'email)

        Returns:
            Dict contenant les entités extraites:
            {
                "persons": ["Jean Dupont", "Marie Martin"],
                "organisations": ["ALFORIS FINANCE", "BNP Paribas"],
                "locations": ["Paris", "Lyon"],
                "dates": ["2024-10-30"],
                "phones": ["+33 6 12 34 56 78"],
                "emails": ["contact@example.com"],
            }
        """
        if not self.is_available():
            logger.debug("NLP non disponible, extraction basique")
            return self._extract_basic(text)

        try:
            doc = self.nlp(text)

            entities = {
                "persons": [],
                "organisations": [],
                "locations": [],
                "dates": [],
                "phones": [],
                "emails": [],
            }

            # Extraire les entités via spaCy
            for ent in doc.ents:
                if ent.label_ == "PER":
                    entities["persons"].append(ent.text)
                elif ent.label_ == "ORG":
                    entities["organisations"].append(ent.text)
                elif ent.label_ == "LOC":
                    entities["locations"].append(ent.text)
                elif ent.label_ == "DATE":
                    entities["dates"].append(ent.text)

            # Dédupliquer
            entities["persons"] = list(set(entities["persons"]))
            entities["organisations"] = list(set(entities["organisations"]))
            entities["locations"] = list(set(entities["locations"]))
            entities["dates"] = list(set(entities["dates"]))

            # Extraire téléphones et emails avec regex (spaCy ne les gère pas bien)
            entities["phones"] = self._extract_phones(text)
            entities["emails"] = self._extract_emails(text)

            logger.debug(
                f"🧠 Entités extraites: {len(entities['persons'])} personnes, "
                f"{len(entities['organisations'])} organisations, "
                f"{len(entities['locations'])} lieux"
            )

            return entities

        except Exception as e:
            logger.error(f"Erreur extraction entités: {e}")
            return self._extract_basic(text)

    def _extract_basic(self, text: str) -> Dict[str, Any]:
        """
        Extraction basique sans spaCy (mode dégradé).

        Utilise uniquement des regex pour téléphones et emails.
        """
        return {
            "persons": [],
            "organisations": [],
            "locations": [],
            "dates": [],
            "phones": self._extract_phones(text),
            "emails": self._extract_emails(text),
        }

    def _extract_phones(self, text: str) -> List[str]:
        """
        Extrait les numéros de téléphone français.

        Formats supportés:
        - +33 6 12 34 56 78
        - 06 12 34 56 78
        - 0612345678
        - +33612345678
        """
        patterns = [
            r'\+33\s*[1-9](?:\s*\d{2}){4}',  # +33 6 12 34 56 78
            r'0[1-9](?:\s*\d{2}){4}',        # 06 12 34 56 78
            r'\+33[1-9]\d{8}',               # +33612345678
            r'0[1-9]\d{8}',                  # 0612345678
        ]

        phones = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            phones.extend(matches)

        # Nettoyer et normaliser
        cleaned_phones = []
        for phone in phones:
            # Retirer les espaces
            cleaned = phone.replace(' ', '')

            # Normaliser au format E.164 (+33...)
            if cleaned.startswith('0'):
                cleaned = '+33' + cleaned[1:]

            if cleaned not in cleaned_phones:
                cleaned_phones.append(cleaned)

        return cleaned_phones

    def _extract_emails(self, text: str) -> List[str]:
        """Extrait les adresses email."""
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(pattern, text)
        return list(set(emails))

    def enrich_person_data(
        self,
        email_body: str,
        from_name: Optional[str] = None,
        signature: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Enrichit les données d'une personne depuis un email.

        Extrait les informations de contact depuis:
        - Le corps de l'email
        - La signature email

        Args:
            email_body: Corps de l'email
            from_name: Nom de l'expéditeur
            signature: Signature email (optionnelle)

        Returns:
            Dict avec données enrichies:
            {
                "phones": ["+33612345678"],
                "company": "ALFORIS FINANCE",
                "job_title": "Directeur",
                "location": "Paris",
            }
        """
        # Analyser le corps + signature
        full_text = email_body
        if signature:
            full_text += "\n\n" + signature

        entities = self.extract_entities(full_text)

        enriched_data = {
            "phones": entities["phones"],
            "company": None,
            "job_title": None,
            "location": None,
        }

        # Détecter l'entreprise (première organisation trouvée)
        if entities["organisations"]:
            enriched_data["company"] = entities["organisations"][0]

        # Détecter le lieu (première location trouvée)
        if entities["locations"]:
            enriched_data["location"] = entities["locations"][0]

        # Détecter le job title (patterns courants dans les signatures)
        job_patterns = [
            r'(?:Directeur|Directrice)(?:\s+(?:Général|des Ventes|Commercial))?',
            r'(?:Responsable)(?:\s+(?:Commercial|Marketing|Ventes))?',
            r'(?:Manager|Chef)(?:\s+de\s+(?:projet|produit))?',
            r'(?:Consultant|Consultante)',
            r'(?:Associé|Associée)',
            r'(?:Président|Présidente)',
            r'(?:Fondateur|Fondatrice)',
            r'PDG|CEO|CFO|CTO|CMO',
        ]

        for pattern in job_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                enriched_data["job_title"] = match.group(0)
                break

        logger.debug(f"🧠 Données enrichies: {enriched_data}")

        return enriched_data

    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extrait les mots-clés principaux d'un texte.

        Utilise les tokens filtrés par POS (noms, verbes, adjectifs).

        Args:
            text: Texte à analyser
            top_n: Nombre de mots-clés à retourner

        Returns:
            Liste des mots-clés les plus importants
        """
        if not self.is_available():
            return []

        try:
            doc = self.nlp(text)

            # Filtrer les tokens pertinents
            keywords = []
            for token in doc:
                # Garder uniquement noms, verbes, adjectifs
                if token.pos_ in ["NOUN", "VERB", "ADJ"]:
                    # Ignorer les stop words et la ponctuation
                    if not token.is_stop and not token.is_punct and len(token.text) > 3:
                        keywords.append(token.lemma_.lower())

            # Compter les occurrences
            keyword_counts = {}
            for kw in keywords:
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

            # Trier par fréquence
            sorted_keywords = sorted(
                keyword_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )

            # Retourner les top N
            return [kw for kw, count in sorted_keywords[:top_n]]

        except Exception as e:
            logger.error(f"Erreur extraction keywords: {e}")
            return []

    def detect_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Détecte le sentiment d'un texte (positif, négatif, neutre).

        Note: spaCy n'a pas de sentiment analysis built-in pour le français.
        Cette fonction est un placeholder pour une future implémentation
        avec un modèle dédié (transformers, etc.).

        Args:
            text: Texte à analyser

        Returns:
            Dict avec sentiment:
            {
                "sentiment": "positive" | "negative" | "neutral",
                "score": 0.85,
            }
        """
        # TODO: Implémenter avec un modèle de sentiment analysis
        # Par exemple: camembert-base ou flaubert

        # Pour l'instant, retourner neutral par défaut
        return {
            "sentiment": "neutral",
            "score": 0.5,
        }

    def extract_intent(self, text: str) -> str:
        """
        Détecte l'intention d'un email (demande info, RDV, réclamation, etc.).

        Utilise des patterns simples pour détecter les intentions courantes.

        Args:
            text: Corps de l'email

        Returns:
            Intent détecté parmi:
            - "meeting_request" (demande de RDV)
            - "information_request" (demande d'information)
            - "complaint" (réclamation)
            - "quote_request" (demande de devis)
            - "follow_up" (relance)
            - "other"
        """
        text_lower = text.lower()

        # Patterns pour chaque intent
        intent_patterns = {
            "meeting_request": [
                r'\b(?:rendez-vous|réunion|rencontre|entretien|rdv)\b',
                r'\b(?:disponible|dispo|planning)\b',
                r'\b(?:quand|à quelle date)\b',
            ],
            "information_request": [
                r'\b(?:pourriez-vous|pouvez-vous)\b.*\b(?:me|nous)\b.*\b(?:envoyer|donner|fournir)\b',
                r'\b(?:information|renseignement|détail|précision)\b',
                r'\b(?:savoir|connaître)\b',
            ],
            "complaint": [
                r'\b(?:problème|souci|erreur|dysfonctionnement)\b',
                r'\b(?:insatisfait|mécontent)\b',
                r'\b(?:réclamation|plainte)\b',
            ],
            "quote_request": [
                r'\b(?:devis|tarif|prix|coût|budget)\b',
                r'\b(?:combien|quel est le prix)\b',
            ],
            "follow_up": [
                r'\b(?:relance|rappel|suite)\b',
                r'\b(?:sans réponse|pas de retour)\b',
            ],
        }

        # Détecter l'intent
        for intent, patterns in intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    logger.debug(f"🧠 Intent détecté: {intent}")
                    return intent

        return "other"


# Singleton global pour réutiliser le modèle chargé
_nlp_service = None


def get_nlp_service() -> EmailNLPService:
    """
    Récupère l'instance singleton du service NLP.

    Cela évite de recharger le modèle spaCy à chaque appel.
    """
    global _nlp_service

    if _nlp_service is None:
        _nlp_service = EmailNLPService()

    return _nlp_service
