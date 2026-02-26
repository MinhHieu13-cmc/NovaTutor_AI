from typing import Dict

# Mock knowledge base
KNOWLEDGE_BASE = {
    "NovaTutor": "NovaTutor là một hệ thống gia sư AI tiên tiến được thiết kế để hỗ trợ sinh viên học tập cá nhân hóa.",
    "Clean Architecture": "Clean Architecture là một mô hình thiết kế phần mềm giúp tách biệt logic nghiệp vụ khỏi các yếu tố kỹ thuật như framework, UI, database.",
    "FastAPI": "FastAPI là một web framework hiện đại, hiệu suất cao để xây dựng các API với Python 3.7+ dựa trên tiêu chuẩn Python type hints."
}

def knowledge_lookup(query: str) -> str:
    """
    Looks up information about NovaTutor and related concepts.
    Args:
        query: The topic to look up.
    Returns:
        Information found or a message indicating not found.
    """
    for key, value in KNOWLEDGE_BASE.items():
        if key.lower() in query.lower():
            return value
    return "Xin lỗi, tôi không tìm thấy thông tin cụ thể về chủ đề này trong cơ sở kiến thức."
