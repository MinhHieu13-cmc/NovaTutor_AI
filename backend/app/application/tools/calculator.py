import math

def calculate(expression: str) -> str:
    """
    Evaluates a mathematical expression.
    Args:
        expression: The math expression to evaluate (e.g., '2 + 2', 'sqrt(16)').
    Returns:
        The result of the evaluation as a string.
    """
    try:
        # Use a limited set of globals for safety
        allowed_names = {
            k: v for k, v in math.__dict__.items() if not k.startswith("__")
        }
        return str(eval(expression, {"__builtins__": {}}, allowed_names))
    except Exception as e:
        return f"Error: {str(e)}"
