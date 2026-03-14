# Backend Test Guide (Phase 2)

This test suite validates adaptive quiz scoring and topic/difficulty selection logic.

## Test structure

- `tests/unit/test_learning_logic.py`
  - Core adaptive logic (`_choose_quiz_topic`, `_choose_difficulty`)
  - Quiz shape and streak helpers
- `tests/integration/test_learning_api.py`
  - API behavior for `generate` and `submit`
  - Mastery update formula regression check

## Run tests

```powershell
Set-Location backend
pytest -q
```

Run only unit tests:

```powershell
Set-Location backend
pytest tests/unit -q
```

Run only integration tests:

```powershell
Set-Location backend
pytest tests/integration -q
```

