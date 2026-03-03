from typing import List, Optional, Dict, Any
from app.domain.repositories.interfaces import IStudentRepository

class CloudSQLStudentRepository(IStudentRepository):
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        # from sqlalchemy import create_engine
        # self.engine = create_engine(connection_string)

    async def get_by_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        print(f"CloudSQL: Fetching student {student_id}")
        return {
            "id": student_id,
            "name": "Hieu",
            "grade_level": "University",
            "interests": ["AI", "Math"],
            "learning_style": "Visual"
        }

    async def update_profile(self, student_id: str, profile_data: Dict[str, Any]) -> bool:
        print(f"CloudSQL: Updating profile for {student_id}")
        return True
