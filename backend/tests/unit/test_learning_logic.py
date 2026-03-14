from datetime import datetime, timedelta, timezone

import pytest

from app.presentation.api.v1.learning import (
    _build_quiz_questions,
    _calculate_streak_days,
    _choose_difficulty,
    _choose_quiz_topic,
)
from conftest import FakeLearningDB


@pytest.mark.asyncio
async def test_choose_quiz_topic_prefers_manual_over_weak_topic() -> None:
    db = FakeLearningDB()
    db.course_subjects["course-1"] = "Algebra"
    db.topic_mastery[("student-1", "course-1", "Fractions")] = {
        "mastery_score": 25.0,
        "last_score": 25.0,
        "attempts": 2,
        "updated_at": datetime.now(timezone.utc),
    }

    topic, source = await _choose_quiz_topic(
        conn=db,
        student_id="student-1",
        course_id="course-1",
        explicit_topic="Derivatives",
        session_goal="Study fractions",
    )

    assert topic == "Derivatives"
    assert source == "manual"


@pytest.mark.asyncio
async def test_choose_quiz_topic_uses_weak_topic_then_session_goal() -> None:
    db = FakeLearningDB()
    db.course_subjects["course-1"] = "Algebra"

    topic, source = await _choose_quiz_topic(
        conn=db,
        student_id="student-1",
        course_id="course-1",
        explicit_topic=None,
        session_goal="Practice linear equations",
    )

    assert topic == "Practice linear equations"
    assert source == "session_goal"


@pytest.mark.asyncio
async def test_choose_difficulty_returns_easy_for_low_recent_scores() -> None:
    db = FakeLearningDB()
    db.topic_mastery[("student-1", "course-1", "Fractions")] = {
        "mastery_score": 32.0,
        "last_score": 30.0,
        "attempts": 3,
        "updated_at": datetime.now(timezone.utc),
    }
    now = datetime.now(timezone.utc)
    for idx, score in enumerate([42, 38, 40, 35]):
        db.quiz_attempts.append(
            {
                "id": f"a-{idx}",
                "quiz_id": "quiz-1",
                "student_id": "student-1",
                "course_id": "course-1",
                "topic": "Fractions",
                "score": score,
                "correct_count": 1,
                "total_questions": 5,
                "created_at": now - timedelta(minutes=idx),
            }
        )

    difficulty, reason = await _choose_difficulty(db, "student-1", "course-1", "Fractions")

    assert difficulty == "easy"
    assert "foundational" in reason.lower()


@pytest.mark.asyncio
async def test_choose_difficulty_returns_hard_for_strong_upward_trend() -> None:
    db = FakeLearningDB()
    db.topic_mastery[("student-1", "course-1", "Algebra")] = {
        "mastery_score": 82.0,
        "last_score": 88.0,
        "attempts": 4,
        "updated_at": datetime.now(timezone.utc),
    }
    now = datetime.now(timezone.utc)
    # Newest -> oldest order expected by query: high recent, lower old.
    for idx, score in enumerate([90, 86, 84, 74, 72, 70]):
        db.quiz_attempts.append(
            {
                "id": f"a-{idx}",
                "quiz_id": "quiz-1",
                "student_id": "student-1",
                "course_id": "course-1",
                "topic": "Algebra",
                "score": score,
                "correct_count": 4,
                "total_questions": 5,
                "created_at": now - timedelta(minutes=idx),
            }
        )

    difficulty, reason = await _choose_difficulty(db, "student-1", "course-1", "Algebra")

    assert difficulty == "hard"
    assert "trend" in reason.lower() or "challenge" in reason.lower()


def test_build_quiz_questions_shape_and_correct_index() -> None:
    questions = _build_quiz_questions(topic="Fractions", difficulty="medium", question_count=5)

    assert len(questions) == 5
    for q in questions:
        assert len(q["options"]) == 4
        assert 0 <= q["correct_index"] < 4


def test_calculate_streak_days_counts_consecutive_days() -> None:
    today = datetime.now(timezone.utc).date()
    activity_dates = [today, today - timedelta(days=1), today - timedelta(days=2), today - timedelta(days=4)]

    streak = _calculate_streak_days(activity_dates)

    assert streak == 3


