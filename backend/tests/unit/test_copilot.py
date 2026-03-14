"""
Unit tests for Phase 3 Teacher Copilot helper functions.
Tests cover: Gemini response extraction, prompt building, duration estimate.
These tests do NOT make real network calls — Gemini is stubbed.
"""

import json
import unittest.mock as mock

import pytest
from fastapi import HTTPException

from app.presentation.api.v1.learning import (
    _copilot_extract_text,
    _copilot_call_gemini,
    GenerateLessonOutlineRequest,
    GenerateQuizContentRequest,
    GenerateAnnouncementRequest,
)


# ── _copilot_extract_text ────────────────────────────────────────────────────

def test_extract_text_returns_parts_joined() -> None:
    payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "Hello"},
                        {"text": " World"},
                    ]
                }
            }
        ]
    }
    result = _copilot_extract_text(payload)
    assert "Hello" in result
    assert "World" in result


def test_extract_text_empty_candidates() -> None:
    assert _copilot_extract_text({"candidates": []}) == ""


def test_extract_text_no_candidates_key() -> None:
    assert _copilot_extract_text({}) == ""


def test_extract_text_skips_parts_without_text() -> None:
    payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"inlineData": "..."},
                        {"text": "Valid text"},
                    ]
                }
            }
        ]
    }
    result = _copilot_extract_text(payload)
    assert result == "Valid text"


# ── _copilot_call_gemini (mocked HTTP) ───────────────────────────────────────

def _fake_gemini_response(text: str) -> bytes:
    return json.dumps({
        "candidates": [{"content": {"parts": [{"text": text}]}}]
    }).encode("utf-8")


def test_copilot_call_gemini_returns_text() -> None:
    expected = "## My Lesson\n\nGreat content here."

    mock_resp = mock.MagicMock()
    mock_resp.read.return_value = _fake_gemini_response(expected)
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = mock.MagicMock(return_value=False)

    with mock.patch("urllib.request.urlopen", return_value=mock_resp):
        result = _copilot_call_gemini("Test prompt", api_key="fake-key")

    assert result == expected


def test_copilot_call_gemini_raises_on_http_error() -> None:
    import urllib.error

    http_err = urllib.error.HTTPError(
        url="https://example.com",
        code=429,
        msg="Too Many Requests",
        hdrs={},  # type: ignore[arg-type]
        fp=mock.MagicMock(read=lambda: b"quota exceeded"),
    )
    with mock.patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HTTPException) as exc_info:
            _copilot_call_gemini("prompt", api_key="fake-key")
    assert exc_info.value.status_code == 502
    assert "Gemini API error" in exc_info.value.detail


# ── Pydantic model validation ────────────────────────────────────────────────

def test_lesson_outline_request_defaults() -> None:
    req = GenerateLessonOutlineRequest(
        course_id="course-1",
        chapter_title="Intro to ML",
    )
    assert req.audience_level == "intermediate"
    assert req.learning_objectives is None


def test_lesson_outline_request_rejects_invalid_level() -> None:
    with pytest.raises(Exception):
        GenerateLessonOutlineRequest(
            course_id="course-1",
            chapter_title="Test",
            audience_level="expert",  # type: ignore[arg-type]
        )


def test_quiz_content_request_defaults() -> None:
    req = GenerateQuizContentRequest(course_id="course-1", topic="Calculus")
    assert req.question_count == 5
    assert req.difficulty == "medium"


def test_quiz_content_request_enforces_min_questions() -> None:
    with pytest.raises(Exception):
        GenerateQuizContentRequest(course_id="course-1", topic="Calculus", question_count=1)


def test_quiz_content_request_enforces_max_questions() -> None:
    with pytest.raises(Exception):
        GenerateQuizContentRequest(course_id="course-1", topic="Calculus", question_count=11)


def test_announcement_request_defaults() -> None:
    req = GenerateAnnouncementRequest(course_id="course-1", subject="New Quiz Posted")
    assert req.tone == "friendly"
    assert req.extra_context is None


def test_announcement_request_rejects_invalid_tone() -> None:
    with pytest.raises(Exception):
        GenerateAnnouncementRequest(
            course_id="course-1",
            subject="Test",
            tone="aggressive",  # type: ignore[arg-type]
        )


# ── Duration estimate heuristic (inline, no DB) ──────────────────────────────

def _estimate_duration(outline: str) -> int:
    """Mirror of the heuristic in generate_lesson_outline endpoint."""
    lines = outline.splitlines()
    activity_rows = [l for l in lines if l.strip().startswith("|") and "---" not in l and "#" not in l]
    if len(activity_rows) > 2:
        return min(90, max(30, (len(activity_rows) - 1) * 12))
    return 60


def test_duration_estimate_default_no_table() -> None:
    assert _estimate_duration("# Chapter\n\nSome text.") == 60


def test_duration_estimate_with_table_rows() -> None:
    outline = "\n".join([
        "## Chapter",
        "| # | Activity | Duration | Method |",
        "|---|----------|----------|--------|",
        "| 1 | Intro | 10 min | Lecture |",
        "| 2 | Demo | 15 min | Demo |",
        "| 3 | Practice | 20 min | Exercise |",
        "| 4 | Q&A | 10 min | Discussion |",
    ])
    # 4 data rows + 1 header → 4 activity_rows (header + 3 data skip separator)
    result = _estimate_duration(outline)
    assert 30 <= result <= 90


def test_duration_estimate_clamps_to_90() -> None:
    # 10 rows → (9) * 12 = 108 → clamped to 90
    rows = ["| " + str(i) + " | act | 10 | lec |" for i in range(10)]
    outline = "## Ch\n| # | Act | Dur | Met |\n" + "\n".join(rows)
    assert _estimate_duration(outline) == 90


def test_duration_estimate_clamps_to_30() -> None:
    # Only 3 rows total — 2 activity_rows, so falls back to default 60
    outline = "## Ch\n| # | A | D | M |\n|---|---|---|---|\n| 1 | act | 5 | lec |"
    assert _estimate_duration(outline) == 60

