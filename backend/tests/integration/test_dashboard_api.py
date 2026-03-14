"""
Regression tests for dashboard API endpoints:
  GET /learning/student/progress
  GET /learning/teacher/at-risk

Dataset is richer than the basic smoke tests and covers:
 - empty state / cold start
 - per-course and global (no course_id) filter paths
 - streak calculation edge cases
 - weekly score aggregation
 - weak-topic ordering (lowest mastery first)
 - at-risk classifications: high / medium / safe / null score
 - multi-student, multi-course scenarios
 - role guards (403)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from conftest import FakeLearningDB


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _attempt(
    fake_db: FakeLearningDB,
    *,
    student_id: str = "student-1",
    course_id: str,
    topic: str,
    score: float,
    days_ago: float = 0,
    attempt_id: str | None = None,
) -> None:
    """Append a quiz attempt to fake_db.quiz_attempts."""
    now = datetime.now(timezone.utc)
    fake_db.quiz_attempts.append(
        {
            "id": attempt_id or f"att-{len(fake_db.quiz_attempts)}",
            "quiz_id": f"quiz-{len(fake_db.quiz_attempts)}",
            "student_id": student_id,
            "course_id": course_id,
            "topic": topic,
            "score": score,
            "correct_count": int(score // 20),
            "total_questions": 5,
            "created_at": now - timedelta(days=days_ago),
        }
    )


def _mastery(
    fake_db: FakeLearningDB,
    *,
    student_id: str = "student-1",
    course_id: str,
    topic: str,
    mastery_score: float,
) -> None:
    fake_db.topic_mastery[(student_id, course_id, topic)] = {
        "mastery_score": mastery_score,
        "last_score": mastery_score,
        "attempts": 3,
        "updated_at": datetime.now(timezone.utc),
    }


def _at_risk_row(
    teacher_id: str = "teacher-1",
    *,
    student_id: str,
    student_name: str,
    course_id: str,
    course_name: str,
    avg_score_21d: float | None,
    last_activity_at: datetime | None = None,
    weak_topic: str | None = None,
) -> dict:
    return {
        "_teacher_id": teacher_id,
        "student_id": student_id,
        "student_name": student_name,
        "course_id": course_id,
        "course_name": course_name,
        "avg_score_21d": avg_score_21d,
        "last_activity_at": last_activity_at or (datetime.now(timezone.utc) if avg_score_21d is not None else None),
        "weak_topic": weak_topic,
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET /student/progress
# ──────────────────────────────────────────────────────────────────────────────

class TestStudentProgress:

    def test_cold_start_returns_default_suggestion(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """No quiz attempts, no mastery data → default 'Start with a quick' suggestion."""
        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["streak_days"] == 0
        assert data["weak_topics"] == []
        assert data["weekly_scores"] == []
        assert "Start with a quick adaptive quiz" in data["next_suggestion"]

    def test_three_weak_topics_ordered_by_lowest_mastery(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """4 topics seeded: bottom 3 returned in ascending mastery order."""
        for topic, ms in [
            ("Fractions", 20.0),
            ("Algebra", 45.0),
            ("Calculus", 10.0),
            ("Geometry", 60.0),
        ]:
            _mastery(fake_learning_db, course_id=seeded_course, topic=topic, mastery_score=ms)

        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["weak_topics"] == ["Calculus", "Fractions", "Algebra"]
        # next_suggestion mentions the weakest topic
        assert "Calculus" in data["next_suggestion"]

    def test_weekly_scores_aggregate_same_week(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """3 attempts within same calendar week → 1 weekly bucket, avg = 80."""
        now = datetime.now(timezone.utc)
        # Monday of current week
        monday = now - timedelta(days=now.weekday())
        for i, score in enumerate([70.0, 80.0, 90.0]):
            fake_learning_db.quiz_attempts.append(
                {
                    "id": f"wk-{i}",
                    "quiz_id": f"wk-q-{i}",
                    "student_id": "student-1",
                    "course_id": seeded_course,
                    "topic": "Algebra",
                    "score": score,
                    "correct_count": 4,
                    "total_questions": 5,
                    "created_at": monday + timedelta(hours=i),
                }
            )

        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["weekly_scores"]) == 1
        assert data["weekly_scores"][0]["score"] == 80.0

    def test_weekly_scores_span_two_weeks(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """Attempts in two different ISO weeks → 2 buckets."""
        now = datetime.now(timezone.utc)
        # 1 attempt this week, 1 attempt 8 days ago (previous week)
        _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=80.0, days_ago=0)
        _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=60.0, days_ago=8)

        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        assert len(response.json()["weekly_scores"]) == 2

    def test_streak_counts_consecutive_days(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """4 consecutive days active, then a gap → streak = 4."""
        for d in range(4):
            _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=75.0, days_ago=d)
        # gap at day 5 – add one on day 6 (should not count in streak)
        _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=60.0, days_ago=6)

        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        assert response.json()["streak_days"] == 4

    def test_streak_zero_when_no_activity_today(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """Last activity was 2 days ago → streak = 0."""
        _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=70.0, days_ago=2)
        _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=70.0, days_ago=3)

        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        assert response.json()["streak_days"] == 0

    def test_high_weekly_score_gives_challenge_suggestion(
        self, student_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """Has weekly data but no weak topics → 'Try a harder quiz' suggestion."""
        _attempt(fake_learning_db, course_id=seeded_course, topic="T", score=95.0, days_ago=0)
        # no mastery records → weak_topics = []

        response = student_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["weak_topics"] == []
        assert len(data["weekly_scores"]) == 1
        assert "harder quiz" in data["next_suggestion"].lower() or "great progress" in data["next_suggestion"].lower()

    def test_global_progress_aggregates_across_courses(
        self, student_client, fake_learning_db: FakeLearningDB
    ) -> None:
        """No course_id → aggregates across all enrolled courses."""
        course_a, course_b = "course-ga", "course-gb"
        fake_learning_db.course_subjects.update({course_a: "Math", course_b: "Science"})
        _mastery(fake_learning_db, course_id=course_a, topic="Vectors", mastery_score=30.0)
        _mastery(fake_learning_db, course_id=course_b, topic="Electrons", mastery_score=25.0)
        _attempt(fake_learning_db, course_id=course_a, topic="Vectors", score=70.0, days_ago=0)
        _attempt(fake_learning_db, course_id=course_b, topic="Electrons", score=65.0, days_ago=1)

        response = student_client.get("/api/v1/learning/student/progress")
        assert response.status_code == 200
        data = response.json()
        # Both weak topics appear (sorted by avg mastery asc)
        assert "Electrons" in data["weak_topics"]
        assert "Vectors" in data["weak_topics"]
        assert len(data["weekly_scores"]) >= 1

    def test_student_progress_forbidden_for_teacher(
        self, teacher_client, seeded_course: str
    ) -> None:
        response = teacher_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 403


# ──────────────────────────────────────────────────────────────────────────────
# GET /teacher/at-risk
# ──────────────────────────────────────────────────────────────────────────────

class TestTeacherAtRisk:

    def test_high_risk_avg_below_55(
        self, teacher_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        fake_learning_db.at_risk_rows = [
            _at_risk_row(
                student_id="s-1",
                student_name="Nam Nguyen",
                course_id=seeded_course,
                course_name="Algebra 101",
                avg_score_21d=42.0,
                weak_topic="Fractions",
            )
        ]
        response = teacher_client.get(
            f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 1
        s = data["students"][0]
        assert s["risk_level"] == "high"
        assert s["student_name"] == "Nam Nguyen"
        assert s["weak_topic"] == "Fractions"
        assert "55" in s["reason"]

    def test_medium_risk_avg_55_to_70(
        self, teacher_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        fake_learning_db.at_risk_rows = [
            _at_risk_row(
                student_id="s-2",
                student_name="Linh Tran",
                course_id=seeded_course,
                course_name="Algebra 101",
                avg_score_21d=63.5,
            )
        ]
        response = teacher_client.get(
            f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 1
        s = data["students"][0]
        assert s["risk_level"] == "medium"
        assert s["avg_score_21d"] == 63.5
        assert "70" in s["reason"]

    def test_safe_student_above_70_is_excluded(
        self, teacher_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        fake_learning_db.at_risk_rows = [
            _at_risk_row(
                student_id="s-3",
                student_name="Hoa Le",
                course_id=seeded_course,
                course_name="Algebra 101",
                avg_score_21d=85.0,
            )
        ]
        response = teacher_client.get(
            f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}"
        )
        assert response.status_code == 200
        assert response.json()["students"] == []

    def test_null_avg_score_classifies_as_high_risk(
        self, teacher_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """Student with no quiz attempts (avg_score_21d = None) → high risk."""
        fake_learning_db.at_risk_rows = [
            _at_risk_row(
                student_id="s-4",
                student_name="Minh Pham",
                course_id=seeded_course,
                course_name="Algebra 101",
                avg_score_21d=None,
                last_activity_at=None,
            )
        ]
        response = teacher_client.get(
            f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 1
        s = data["students"][0]
        assert s["risk_level"] == "high"
        assert s["avg_score_21d"] is None
        assert s["last_activity_at"] is None
        assert "No quiz" in s["reason"]

    def test_mixed_cohort_only_at_risk_returned(
        self, teacher_client, fake_learning_db: FakeLearningDB, seeded_course: str
    ) -> None:
        """4 students: 1 high, 1 medium, 1 safe, 1 null → 3 at-risk returned."""
        fake_learning_db.at_risk_rows = [
            _at_risk_row(student_id="s-5", student_name="An Vo",   course_id=seeded_course, course_name="C", avg_score_21d=50.0),
            _at_risk_row(student_id="s-6", student_name="Bao Tran", course_id=seeded_course, course_name="C", avg_score_21d=68.0),
            _at_risk_row(student_id="s-7", student_name="Chi Do",   course_id=seeded_course, course_name="C", avg_score_21d=90.0),
            _at_risk_row(student_id="s-8", student_name="Dung Ha",  course_id=seeded_course, course_name="C", avg_score_21d=None, last_activity_at=None),
        ]
        response = teacher_client.get(
            f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}"
        )
        assert response.status_code == 200
        students = response.json()["students"]
        names = {s["student_name"] for s in students}
        assert "An Vo" in names       # high
        assert "Bao Tran" in names    # medium
        assert "Chi Do" not in names  # safe → excluded
        assert "Dung Ha" in names     # null → high
        assert len(students) == 3

    def test_course_filter_isolates_results(
        self, teacher_client, fake_learning_db: FakeLearningDB
    ) -> None:
        course_x, course_y = "course-xx", "course-yy"
        fake_learning_db.at_risk_rows = [
            _at_risk_row(student_id="sx", student_name="StudentX", course_id=course_x, course_name="Math",    avg_score_21d=40.0),
            _at_risk_row(student_id="sy", student_name="StudentY", course_id=course_y, course_name="Science", avg_score_21d=30.0),
        ]
        response = teacher_client.get(f"/api/v1/learning/teacher/at-risk?course_id={course_x}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["students"]) == 1
        assert data["students"][0]["student_id"] == "sx"

    def test_no_course_filter_returns_all_at_risk(
        self, teacher_client, fake_learning_db: FakeLearningDB
    ) -> None:
        course_x, course_y = "course-xx2", "course-yy2"
        fake_learning_db.at_risk_rows = [
            _at_risk_row(student_id="sx2", student_name="StudentX2", course_id=course_x, course_name="Math",    avg_score_21d=40.0),
            _at_risk_row(student_id="sy2", student_name="StudentY2", course_id=course_y, course_name="Science", avg_score_21d=30.0),
        ]
        response = teacher_client.get("/api/v1/learning/teacher/at-risk")
        assert response.status_code == 200
        assert len(response.json()["students"]) == 2

    def test_at_risk_forbidden_for_student(
        self, student_client, seeded_course: str
    ) -> None:
        response = student_client.get(
            f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}"
        )
        assert response.status_code == 403

    def test_teacher_cannot_access_student_progress(
        self, teacher_client, seeded_course: str
    ) -> None:
        response = teacher_client.get(
            f"/api/v1/learning/student/progress?course_id={seeded_course}"
        )
        assert response.status_code == 403

