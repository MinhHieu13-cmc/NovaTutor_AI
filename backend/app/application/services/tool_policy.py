from typing import List, Dict, Set

class ToolPolicyLayer:
    """
    Quản lý quyền hạn sử dụng công cụ dựa trên vai trò của Agent.
    """
    def __init__(self):
        # Định nghĩa các quyền của Agent
        self.permissions: Dict[str, Set[str]] = {
            "TutorAgent": {"calculate", "knowledge_lookup"},
            "MemoryAgent": {"get_student_context", "update_student_profile"},
            "CurriculumAgent": {"search_curriculum"},
            "AssessmentAgent": {"evaluate_answer"},
            "EmotionAdapter": {"analyze_sentiment"}
        }

    def can_use_tool(self, agent_name: str, tool_name: str) -> bool:
        """
        Kiểm tra xem một Agent có quyền sử dụng một công cụ cụ thể không.
        """
        allowed_tools = self.permissions.get(agent_name, set())
        return tool_name in allowed_tools

    def get_allowed_tools(self, agent_name: str) -> List[str]:
        """
        Lấy danh sách các công cụ mà Agent được phép sử dụng.
        """
        return list(self.permissions.get(agent_name, set()))
