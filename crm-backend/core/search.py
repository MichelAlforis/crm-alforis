"""
Module Search - Recherche Globale Full-Text

Ce module fournit:
- Recherche full-text PostgreSQL (tsvector + GIN index)
- Recherche multi-entités (organisations, people, mandats, etc.)
- Ranking par pertinence (ts_rank)
- Autocomplete intelligent
- Filtres avancés

Usage:
    from core.search import SearchService, search_all

    # Recherche globale
    results = await search_all(
        query="Alforis",
        db=db,
        current_user=user,
        limit=20
    )

    # Recherche avec filtres
    results = SearchService.search_organisations(
        query="finance",
        filters={"category": "INSTITUTION"},
        db=db
    )
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from sqlalchemy import and_, func, or_, text
from sqlalchemy.orm import Session

from core.permissions import filter_query_by_team
from models.mandat import Mandat
from models.organisation import Organisation, OrganisationCategory
from models.person import Person


class SearchService:
    """
    Service de recherche globale

    Gère la recherche full-text PostgreSQL avec ranking,
    autocomplete et filtres avancés.
    """

    @staticmethod
    def search_organisations(
        query: str,
        db: Session,
        current_user,
        filters: Optional[Dict] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Recherche d'organisations avec Full-Text Search

        Args:
            query: Terme de recherche
            db: Session database
            current_user: Utilisateur courant (pour permissions)
            filters: Filtres additionnels (category, type, etc.)
            limit: Nombre max de résultats
            offset: Pagination offset

        Returns:
            Dict avec results et metadata
        """
        dialect = getattr(getattr(db, "bind", None), "dialect", None)
        use_fulltext = (
            dialect is not None
            and dialect.name.lower().startswith("postgres")
            and hasattr(Organisation, "search_vector")
            and query
        )

        if use_fulltext:
            base_query = db.query(
                Organisation,
                func.ts_rank(
                    Organisation.search_vector, func.plainto_tsquery("french", query)
                ).label("rank"),
            )

            base_query = base_query.filter(
                Organisation.search_vector.op("@@")(func.plainto_tsquery("french", query))
            )
        else:
            base_query = db.query(Organisation)
            like_pattern = f"%{query}%" if query else None
            if like_pattern:
                base_query = base_query.filter(
                    or_(
                        Organisation.name.ilike(like_pattern),
                        Organisation.email.ilike(like_pattern),
                        Organisation.notes.ilike(like_pattern),
                    )
                )

        # Appliquer filtres additionnels
        if filters:
            if "category" in filters:
                base_query = base_query.filter(Organisation.category == filters["category"])
            if "type" in filters:
                base_query = base_query.filter(Organisation.type == filters["type"])
            if "is_active" in filters:
                base_query = base_query.filter(Organisation.is_active == filters["is_active"])
            if "pipeline_stage" in filters:
                base_query = base_query.filter(
                    Organisation.pipeline_stage == filters["pipeline_stage"]
                )

        # Filtrer par permissions (équipe)
        base_query = filter_query_by_team(base_query, current_user, Organisation)

        # Trier par pertinence
        if use_fulltext:
            base_query = base_query.order_by(text("rank DESC"))
        else:
            base_query = base_query.order_by(Organisation.name)

        # Total (avant pagination)
        total = base_query.count()

        # Pagination et formatage
        results = base_query.offset(offset).limit(limit).all()

        if use_fulltext:
            items = [
                {
                    **org.to_dict(),
                    "relevance": float(rank),
                    "match_type": "full_text",
                }
                for org, rank in results
            ]
        else:
            items = [
                {
                    **org.to_dict(),
                    "relevance": None,
                    "match_type": "fallback",
                }
                for org in results
            ]

        return {
            "items": items,
            "total": total,
            "query": query,
            "filters": filters or {},
            "limit": limit,
            "offset": offset,
        }

    @staticmethod
    def search_people(
        query: str,
        db: Session,
        current_user,
        filters: Optional[Dict] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Recherche de personnes

        Recherche par nom, prénom, email avec ILIKE
        (PostgreSQL Full-Text Search à implémenter si besoin)
        """
        base_query = db.query(Person)

        # Recherche ILIKE (simple)
        search_filter = or_(
            Person.first_name.ilike(f"%{query}%"),
            Person.last_name.ilike(f"%{query}%"),
            Person.personal_email.ilike(f"%{query}%"),
            Person.phone.ilike(f"%{query}%"),
        )

        base_query = base_query.filter(search_filter)

        # Filtres additionnels
        if filters:
            if "is_active" in filters:
                base_query = base_query.filter(Person.is_active == filters["is_active"])

        # Permissions
        # Note: Person n'a pas de owner_id direct, filtrage via organisations liées si besoin

        # Total
        total = base_query.count()

        # Pagination
        results = base_query.offset(offset).limit(limit).all()

        # Formater
        items = [
            {
                **person.to_dict(),
                "match_type": "name_email",
            }
            for person in results
        ]

        return {
            "items": items,
            "total": total,
            "query": query,
            "filters": filters or {},
            "limit": limit,
            "offset": offset,
        }

    @staticmethod
    def search_mandats(
        query: str,
        db: Session,
        current_user,
        filters: Optional[Dict] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Recherche de mandats

        Recherche par numéro, type, notes
        """
        base_query = db.query(Mandat)

        # Recherche simple
        search_filter = or_(
            Mandat.number.ilike(f"%{query}%"),
            Mandat.type.ilike(f"%{query}%"),
            Mandat.notes.ilike(f"%{query}%") if hasattr(Mandat, "notes") else False,
        )

        base_query = base_query.filter(search_filter)

        # Filtres
        if filters:
            if "status" in filters:
                base_query = base_query.filter(Mandat.status == filters["status"])
            if "type" in filters:
                base_query = base_query.filter(Mandat.type == filters["type"])

        # Permissions
        base_query = filter_query_by_team(base_query, current_user, Mandat)

        # Total
        total = base_query.count()

        # Pagination
        results = base_query.offset(offset).limit(limit).all()

        # Formater
        items = [
            {
                **mandat.to_dict(),
                "match_type": "number_type",
            }
            for mandat in results
        ]

        return {
            "items": items,
            "total": total,
            "query": query,
            "filters": filters or {},
            "limit": limit,
            "offset": offset,
        }

    @staticmethod
    def search_all(
        query: str,
        db: Session,
        current_user,
        entity_types: Optional[List[str]] = None,
        limit_per_type: int = 5,
    ) -> Dict[str, Any]:
        """
        Recherche globale multi-entités

        Cherche dans toutes les entités et retourne les meilleurs résultats
        de chaque type.

        Args:
            query: Terme de recherche
            db: Session database
            current_user: Utilisateur courant
            entity_types: Types à chercher (None = tous)
            limit_per_type: Limite par type d'entité

        Returns:
            Dict avec résultats par type
        """
        if not entity_types:
            entity_types = ["organisations", "people", "mandats"]

        results = {}

        # Rechercher organisations
        if "organisations" in entity_types:
            org_results = SearchService.search_organisations(
                query=query,
                db=db,
                current_user=current_user,
                limit=limit_per_type,
            )
            results["organisations"] = org_results["items"]

        # Rechercher personnes
        if "people" in entity_types:
            people_results = SearchService.search_people(
                query=query,
                db=db,
                current_user=current_user,
                limit=limit_per_type,
            )
            results["people"] = people_results["items"]

        # Rechercher mandats
        if "mandats" in entity_types:
            mandat_results = SearchService.search_mandats(
                query=query,
                db=db,
                current_user=current_user,
                limit=limit_per_type,
            )
            results["mandats"] = mandat_results["items"]

        # Calculer total
        total = sum(len(items) for items in results.values())

        return {
            "query": query,
            "results": results,
            "total": total,
            "entity_types": entity_types,
        }

    @staticmethod
    def autocomplete(
        query: str,
        db: Session,
        current_user,
        entity_type: str = "organisations",
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Autocomplete pour recherche

        Retourne des suggestions basées sur les premiers caractères.

        Args:
            query: Début du terme (min 2 caractères)
            db: Session database
            current_user: Utilisateur courant
            entity_type: Type d'entité (organisations, people, mandats)
            limit: Nombre de suggestions

        Returns:
            Liste de suggestions [{id, name, type}]
        """
        if len(query) < 2:
            return []

        suggestions = []

        if entity_type == "organisations":
            # Rechercher organisations
            orgs = (
                db.query(Organisation)
                .filter(Organisation.name.ilike(f"{query}%"))
                .limit(limit)
                .all()
            )

            suggestions = [
                {
                    "id": org.id,
                    "name": org.name,
                    "type": "organisation",
                    "category": org.category,
                }
                for org in orgs
            ]

        elif entity_type == "people":
            # Rechercher personnes
            people = (
                db.query(Person)
                .filter(
                    or_(
                        Person.first_name.ilike(f"{query}%"),
                        Person.last_name.ilike(f"{query}%"),
                    )
                )
                .limit(limit)
                .all()
            )

            suggestions = [
                {
                    "id": person.id,
                    "name": f"{person.first_name} {person.last_name}",
                    "type": "person",
                    "email": person.personal_email,
                }
                for person in people
            ]

        elif entity_type == "mandats":
            # Rechercher mandats
            mandats = db.query(Mandat).filter(Mandat.number.ilike(f"{query}%")).limit(limit).all()

            suggestions = [
                {
                    "id": mandat.id,
                    "name": mandat.number,
                    "type": "mandat",
                    "status": mandat.status,
                }
                for mandat in mandats
            ]

        return suggestions

    @staticmethod
    def get_search_suggestions(
        query: str,
        db: Session,
        limit: int = 5,
    ) -> List[str]:
        """
        Suggestions de recherche basées sur l'historique

        Retourne des termes de recherche populaires/récents.

        Args:
            query: Début du terme
            db: Session database
            limit: Nombre de suggestions

        Returns:
            Liste de suggestions de termes
        """
        # TODO: Implémenter table search_history pour stocker les recherches
        # Pour l'instant, suggestions statiques
        common_terms = [
            "finance",
            "banque",
            "investissement",
            "assurance",
            "immobilier",
            "tech",
            "startup",
        ]

        # Filtrer par query
        suggestions = [term for term in common_terms if term.startswith(query.lower())]

        return suggestions[:limit]


# ============================================
# Helpers Simplifiés
# ============================================


async def search_all(
    query: str,
    db: Session,
    current_user,
    entity_types: Optional[List[str]] = None,
    limit_per_type: int = 5,
) -> Dict[str, Any]:
    """
    Helper pour recherche globale rapide

    Args:
        query: Terme de recherche
        db: Session database
        current_user: Utilisateur courant
        entity_types: Types à chercher
        limit_per_type: Limite par type

    Returns:
        Résultats de recherche
    """
    return SearchService.search_all(
        query=query,
        db=db,
        current_user=current_user,
        entity_types=entity_types,
        limit_per_type=limit_per_type,
    )


async def autocomplete(
    query: str,
    db: Session,
    current_user,
    entity_type: str = "organisations",
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Helper pour autocomplete rapide

    Args:
        query: Début du terme
        db: Session database
        current_user: Utilisateur courant
        entity_type: Type d'entité
        limit: Nombre de suggestions

    Returns:
        Liste de suggestions
    """
    return SearchService.autocomplete(
        query=query,
        db=db,
        current_user=current_user,
        entity_type=entity_type,
        limit=limit,
    )
