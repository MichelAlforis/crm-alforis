from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from core.exceptions import ResourceNotFound, DatabaseError, ValidationError
import logging

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Service générique CRUD pour tous les modèles
    
    Usage:
        class InvestorService(BaseService[Investor, InvestorCreate, InvestorUpdate]):
            def __init__(self, db: Session):
                super().__init__(Investor, db)
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
        self.model_name = model.__name__
        
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: dict = None
    ) -> tuple[List[ModelType], int]:
        """
        Récupérer tous les enregistrements avec pagination
        
        Args:
            skip: Nombre d'enregistrements à ignorer
            limit: Nombre d'enregistrements à retourner
            filters: Dictionnaire de filtres {column_name: value}
        
        Returns:
            (liste d'objets, total_count)
        """
        try:
            query = self.db.query(self.model)
            
            # Appliquer les filtres
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key) and value is not None:
                        query = query.filter(getattr(self.model, key) == value)
            
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            
            return items, total
        except Exception as e:
            logger.error(f"Error fetching {self.model_name}: {e}")
            raise DatabaseError(f"Failed to fetch {self.model_name}")
    
    async def get_by_id(self, id: int) -> ModelType:
        """Récupérer un enregistrement par son ID"""
        try:
            item = self.db.query(self.model).filter(self.model.id == id).first()
            if not item:
                raise ResourceNotFound(self.model_name, id)
            return item
        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error fetching {self.model_name} by ID {id}: {e}")
            raise DatabaseError(f"Failed to fetch {self.model_name}")
    
    async def create(self, schema: CreateSchemaType) -> ModelType:
        """Créer un nouvel enregistrement"""
        try:
            obj_data = schema.model_dump(exclude_unset=True)
            db_obj = self.model(**obj_data)
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            logger.info(f"Created {self.model_name} with ID {db_obj.id}")
            return db_obj
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating {self.model_name}: {e}")
            raise DatabaseError(f"Failed to create {self.model_name}")
    
    async def update(self, id: int, schema: UpdateSchemaType) -> ModelType:
        """Mettre à jour un enregistrement"""
        try:
            db_obj = await self.get_by_id(id)
            
            update_data = schema.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                if hasattr(db_obj, key):
                    setattr(db_obj, key, value)
            
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            logger.info(f"Updated {self.model_name} with ID {id}")
            return db_obj
        except ResourceNotFound:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating {self.model_name} {id}: {e}")
            raise DatabaseError(f"Failed to update {self.model_name}")
    
    async def delete(self, id: int) -> bool:
        """Supprimer un enregistrement"""
        try:
            db_obj = await self.get_by_id(id)
            self.db.delete(db_obj)
            self.db.commit()
            logger.info(f"Deleted {self.model_name} with ID {id}")
            return True
        except ResourceNotFound:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting {self.model_name} {id}: {e}")
            raise DatabaseError(f"Failed to delete {self.model_name}")
    
    async def bulk_create(self, schemas: List[CreateSchemaType]) -> List[ModelType]:
        """Créer plusieurs enregistrements en une transaction"""
        try:
            objs = [self.model(**schema.model_dump()) for schema in schemas]
            self.db.add_all(objs)
            self.db.commit()
            logger.info(f"Created {len(objs)} {self.model_name} objects")
            return objs
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error bulk creating {self.model_name}: {e}")
            raise DatabaseError(f"Failed to bulk create {self.model_name}")
    
    async def count(self, filters: dict = None) -> int:
        """Compter le nombre d'enregistrements"""
        try:
            query = self.db.query(self.model)
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key) and value is not None:
                        query = query.filter(getattr(self.model, key) == value)
            return query.count()
        except Exception as e:
            logger.error(f"Error counting {self.model_name}: {e}")
            raise DatabaseError(f"Failed to count {self.model_name}")