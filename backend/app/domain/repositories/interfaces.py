from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.domain.models.core import User

class IStudentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def update_profile(self, student_id: str, profile_data: Dict[str, Any]) -> bool:
        pass

class ISessionRepository(ABC):
    @abstractmethod
    async def save_message(self, session_id: str, message: Dict[str, Any]) -> None:
        pass

    @abstractmethod
    async def get_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        pass

class IVectorRepository(ABC):
    @abstractmethod
    async def search(self, query_vector: List[float], top_k: int = 5, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def upsert(self, id: str, vector: List[float], metadata: Dict[str, Any]) -> None:
        pass
