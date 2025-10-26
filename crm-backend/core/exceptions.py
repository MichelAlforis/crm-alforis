from fastapi import status


class APIException(Exception):
    """Exception de base pour toutes les erreurs API"""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ResourceNotFound(APIException):
    """Ressource non trouvée"""
    def __init__(self, resource: str, resource_id: any):
        message = f"{resource} with ID {resource_id} not found"
        super().__init__(message, status.HTTP_404_NOT_FOUND)

class ValidationError(APIException):
    """Erreur de validation"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY)

class UnauthorizedError(APIException):
    """Authentification échouée"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)

class ForbiddenError(APIException):
    """Accès interdit"""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)

class ConflictError(APIException):
    """Conflit - ressource existe déjà"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_409_CONFLICT)

class InternalServerError(APIException):
    """Erreur serveur interne"""
    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)

class DatabaseError(APIException):
    """Erreur base de données"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)