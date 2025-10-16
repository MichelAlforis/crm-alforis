from pydantic import BaseModel as PydanticBaseModel, ConfigDict
from datetime import datetime
from typing import Generic, TypeVar, Optional

T = TypeVar("T")

class BaseSchema(PydanticBaseModel):
    """Schéma de base pour toutes les réponses"""
    model_config = ConfigDict(from_attributes=True)

class TimestampedSchema(BaseSchema):
    """Schéma avec timestamps"""
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PaginationParams(BaseSchema):
    """Paramètres de pagination"""
    skip: int = 0
    limit: int = 100
    
    class Config:
        ge = 0  # greater or equal

class PaginatedResponse(BaseSchema, Generic[T]):
    """Réponse paginée générique"""
    total: int
    skip: int
    limit: int
    items: list[T]
    
    @property
    def total_pages(self) -> int:
        return (self.total + self.limit - 1) // self.limit
    
    @property
    def current_page(self) -> int:
        return (self.skip // self.limit) + 1

class HealthCheckResponse(BaseSchema):
    """Réponse du health check"""
    status: str
    database: bool
    timestamp: datetime