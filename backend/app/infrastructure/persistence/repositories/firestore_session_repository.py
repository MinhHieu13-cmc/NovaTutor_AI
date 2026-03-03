from typing import List, Optional, Dict, Any
from app.domain.repositories.interfaces import ISessionRepository

class FirestoreSessionRepository(ISessionRepository):
    def __init__(self, project_id: str):
        self.project_id = project_id
        # from google.cloud import firestore
        # self.db = firestore.Client(project=project_id)
    
    async def save_message(self, session_id: str, message: Dict[str, Any]) -> None:
        print(f"Firestore: Saving message to session {session_id}")
        # self.db.collection("sessions").document(session_id).collection("messages").add(message)
        pass

    async def get_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        print(f"Firestore: Fetching history for {session_id}")
        return [
            {"role": "user", "content": "Hi", "timestamp": "2026-02-25T10:00:00Z"},
            {"role": "assistant", "content": "Hello! How can I help you today?", "timestamp": "2026-02-25T10:00:05Z"}
        ]
