from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.presentation.api.v1.auth_gcp import get_current_user
from app.presentation.api.v1.learning import router as learning_router


@dataclass
class FakeLearningDB:
    course_subjects: dict[str, str] = field(default_factory=dict)
    course_names: dict[str, str] = field(default_factory=dict)
    course_owners: dict[str, str] = field(default_factory=dict)
    topic_mastery: dict[tuple[str, str, str], dict[str, Any]] = field(default_factory=dict)
    quiz_attempts: list[dict[str, Any]] = field(default_factory=list)
    enrollments: list[dict[str, str]] = field(default_factory=list)
    sessions: dict[str, dict[str, Any]] = field(default_factory=dict)
    teacher_quiz_banks: list[dict[str, Any]] = field(default_factory=list)
    document_chunks: dict[str, list[str]] = field(default_factory=dict)
    # Rows returned by the teacher at-risk JOIN query.  Each row must include
    # a "_teacher_id" sentinel used for filtering; this key is stripped before
    # the row is handed back to the endpoint.
    at_risk_rows: list[dict[str, Any]] = field(default_factory=list)

    async def close(self) -> None:
        return None

    async def execute(self, query: str, *args: Any) -> None:
        if "INSERT INTO adaptive_quiz_sessions" in query:
            quiz_id, student_id, course_id, topic, difficulty, questions_json = args
            normalized_questions = json.loads(questions_json) if isinstance(questions_json, str) else questions_json
            self.sessions[quiz_id] = {
                "id": quiz_id,
                "student_id": student_id,
                "course_id": course_id,
                "topic": topic,
                "difficulty": difficulty,
                "questions_json": normalized_questions,
                "created_at": datetime.now(timezone.utc),
            }
            return None

        if "INSERT INTO quiz_attempts" in query:
            (
                attempt_id,
                quiz_id,
                student_id,
                course_id,
                topic,
                score,
                correct_count,
                total_questions,
            ) = args
            self.quiz_attempts.append(
                {
                    "id": attempt_id,
                    "quiz_id": quiz_id,
                    "student_id": student_id,
                    "course_id": course_id,
                    "topic": topic,
                    "score": float(score),
                    "correct_count": int(correct_count),
                    "total_questions": int(total_questions),
                    "created_at": datetime.now(timezone.utc),
                }
            )
            return None

        if "UPDATE topic_mastery" in query:
            mastery_score, last_score, attempts, student_id, course_id, topic = args
            self.topic_mastery[(student_id, course_id, topic)] = {
                "mastery_score": float(mastery_score),
                "last_score": float(last_score),
                "attempts": int(attempts),
                "updated_at": datetime.now(timezone.utc),
            }
            return None

        if "INSERT INTO topic_mastery" in query:
            student_id, course_id, topic, mastery_score, last_score = args
            self.topic_mastery[(student_id, course_id, topic)] = {
                "mastery_score": float(mastery_score),
                "last_score": float(last_score),
                "attempts": 1,
                "updated_at": datetime.now(timezone.utc),
            }
            return None

        if "INSERT INTO teacher_quiz_banks" in query:
            bank_id, teacher_id, course_id, topic, difficulty, quiz_content, questions_json = args
            normalized_questions = json.loads(questions_json) if isinstance(questions_json, str) else questions_json
            self.teacher_quiz_banks.append(
                {
                    "id": bank_id,
                    "teacher_id": teacher_id,
                    "course_id": course_id,
                    "topic": topic,
                    "difficulty": difficulty,
                    "quiz_content": quiz_content,
                    "questions_json": normalized_questions,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            return None

        if "UPDATE teacher_quiz_banks" in query:
            topic, difficulty, quiz_content, questions_json, bank_id = args
            normalized_questions = json.loads(questions_json) if isinstance(questions_json, str) else questions_json
            for row in self.teacher_quiz_banks:
                if row["id"] == bank_id:
                    row["topic"] = topic
                    row["difficulty"] = difficulty
                    row["quiz_content"] = quiz_content
                    row["questions_json"] = normalized_questions
                    row["updated_at"] = datetime.now(timezone.utc)
                    break
            return None

        if "DELETE FROM teacher_quiz_banks WHERE id=$1" in query:
            bank_id = args[0]
            self.teacher_quiz_banks = [row for row in self.teacher_quiz_banks if row["id"] != bank_id]
            return None

        # CREATE TABLE / INDEX and other infra SQL are no-op in fake DB.
        return None

    async def fetchrow(self, query: str, *args: Any) -> dict[str, Any] | None:
        if "SELECT id FROM courses WHERE id=$1 AND teacher_id=$2" in query:
            course_id, teacher_id = args
            if self.course_owners.get(course_id) == teacher_id:
                return {"id": course_id}
            return None

        if "SELECT name, subject FROM courses WHERE id=$1" in query:
            course_id = args[0]
            name = self.course_names.get(course_id)
            subject = self.course_subjects.get(course_id)
            if not name and not subject:
                return None
            return {"name": name or course_id, "subject": subject}

        if "SELECT name FROM courses WHERE id=$1" in query:
            course_id = args[0]
            name = self.course_names.get(course_id)
            return {"name": name} if name else None

        if "SELECT topic" in query and "FROM topic_mastery" in query and "ORDER BY mastery_score ASC" in query:
            student_id, course_id = args
            rows = [
                {"topic": topic, **row}
                for (sid, cid, topic), row in self.topic_mastery.items()
                if sid == student_id and cid == course_id
            ]
            if not rows:
                return None
            rows.sort(key=lambda r: (r["mastery_score"], -r.get("attempts", 0), r.get("updated_at", datetime.min.replace(tzinfo=timezone.utc))), reverse=False)
            return {"topic": rows[0]["topic"]}

        if "SELECT subject FROM courses" in query:
            course_id = args[0]
            subject = self.course_subjects.get(course_id)
            return {"subject": subject} if subject else None

        if "SELECT mastery_score, attempts" in query and "FROM topic_mastery" in query:
            student_id, course_id, topic = args
            row = self.topic_mastery.get((student_id, course_id, topic))
            if not row:
                return None
            return {
                "mastery_score": row["mastery_score"],
                "attempts": row["attempts"],
            }

        if "SELECT id, student_id, course_id, topic, questions_json" in query and "FROM adaptive_quiz_sessions" in query:
            quiz_id = args[0]
            return self.sessions.get(quiz_id)

        if "SELECT id, course_id, teacher_id FROM teacher_quiz_banks WHERE id=$1" in query:
            bank_id = args[0]
            for row in self.teacher_quiz_banks:
                if row["id"] == bank_id:
                    return {"id": row["id"], "course_id": row["course_id"], "teacher_id": row["teacher_id"]}
            return None

        if "SELECT id, course_id, topic, difficulty, quiz_content, questions_json, created_at, updated_at" in query and "FROM teacher_quiz_banks" in query and "WHERE id=$1" in query:
            bank_id = args[0]
            for row in self.teacher_quiz_banks:
                if row["id"] == bank_id:
                    return row
            return None

        if "FROM teacher_quiz_banks" in query and "lower(topic)=lower($2)" in query:
            course_id, topic = args[0], args[1]
            matches = [
                row for row in self.teacher_quiz_banks
                if row["course_id"] == course_id and row["topic"].lower() == str(topic).lower()
            ]
            if not matches:
                return None
            matches.sort(key=lambda r: r["created_at"], reverse=True)
            return {"questions_json": matches[0]["questions_json"]}

        if "FROM teacher_quiz_banks" in query and "WHERE course_id=$1" in query:
            course_id = args[0]
            matches = [row for row in self.teacher_quiz_banks if row["course_id"] == course_id]
            if not matches:
                return None
            matches.sort(key=lambda r: r["created_at"], reverse=True)
            return {"questions_json": matches[0]["questions_json"]}

        return None

    async def fetch(self, query: str, *args: Any) -> list[dict[str, Any]]:
        if "FROM document_embeddings de" in query and "JOIN course_documents cd" in query:
            course_id = args[0]
            limit = int(args[1]) if len(args) > 1 else 6
            chunks = self.document_chunks.get(course_id, [])
            return [{"chunk_text": chunk} for chunk in chunks[:limit]]

        if "COUNT(DISTINCT e.student_id) AS student_count" in query and "FROM courses c" in query:
            teacher_id = args[0]
            rows = []
            for course_id, owner in self.course_owners.items():
                if owner != teacher_id:
                    continue
                enrolled_students = {
                    row["student_id"]
                    for row in self.enrollments
                    if row["course_id"] == course_id
                }
                rows.append(
                    {
                        "course_id": course_id,
                        "course_name": self.course_names.get(course_id, course_id),
                        "student_count": len(enrolled_students),
                    }
                )
            return rows

        # ── 1. Recent scores for difficulty calculation ───────────────────
        if "SELECT score" in query and "FROM quiz_attempts" in query:
            student_id, course_id, topic = args
            rows = [
                {"score": row["score"]}
                for row in sorted(self.quiz_attempts, key=lambda r: r["created_at"], reverse=True)
                if row["student_id"] == student_id and row["course_id"] == course_id and row["topic"] == topic
            ]
            return rows[:6]

        # ── 2. Weekly avg scores for progress chart ───────────────────────
        #    SELECT date_trunc('week', ...) AS week_start, AVG(score) AS avg_score
        if "week_start" in query:
            now = datetime.now(timezone.utc)
            eight_weeks_ago = now - timedelta(weeks=8)
            if len(args) >= 2:
                student_id, course_id = args[0], args[1]
                filtered = [
                    a for a in self.quiz_attempts
                    if a["student_id"] == student_id
                    and a["course_id"] == course_id
                    and a["created_at"] >= eight_weeks_ago
                ]
            else:
                student_id = args[0]
                filtered = [
                    a for a in self.quiz_attempts
                    if a["student_id"] == student_id and a["created_at"] >= eight_weeks_ago
                ]
            week_groups: dict[Any, list[float]] = {}
            for a in filtered:
                dt_date = a["created_at"].date()
                week_start = dt_date - timedelta(days=dt_date.weekday())
                week_groups.setdefault(week_start, []).append(float(a["score"]))
            return sorted(
                [{"week_start": ws, "avg_score": sum(sc) / len(sc)} for ws, sc in week_groups.items()],
                key=lambda r: r["week_start"],
            )

        # ── 3. Activity dates for streak calculation ──────────────────────
        #    SELECT created_at::date AS activity_date FROM quiz_attempts
        if "activity_date" in query:
            if len(args) >= 2:
                student_id, course_id = args[0], args[1]
                filtered = sorted(
                    [a for a in self.quiz_attempts
                     if a["student_id"] == student_id and a["course_id"] == course_id],
                    key=lambda r: r["created_at"],
                    reverse=True,
                )
            else:
                student_id = args[0]
                filtered = sorted(
                    [a for a in self.quiz_attempts if a["student_id"] == student_id],
                    key=lambda r: r["created_at"],
                    reverse=True,
                )
            return [{"activity_date": a["created_at"].date()} for a in filtered[:30]]

        # ── 4. Global weak topics (AVG mastery across all courses) ────────
        #    SELECT topic, AVG(mastery_score) AS avg_mastery … ORDER BY avg_mastery ASC LIMIT 3
        if "avg_mastery" in query:
            student_id = args[0]
            topic_scores: dict[str, list[float]] = {}
            for (sid, _cid, topic), row in self.topic_mastery.items():
                if sid == student_id:
                    topic_scores.setdefault(topic, []).append(float(row["mastery_score"]))
            rows_global = [
                {"topic": t, "avg_mastery": sum(scores) / len(scores)}
                for t, scores in topic_scores.items()
            ]
            rows_global.sort(key=lambda r: r["avg_mastery"])
            return rows_global[:3]

        # ── 5. Per-course weak topics (mastery ASC, LIMIT 3) ─────────────
        #    SELECT topic, mastery_score FROM topic_mastery … LIMIT 3
        if "topic, mastery_score" in query:
            student_id, course_id = args[0], args[1]
            rows_tm = [
                {"topic": topic, "mastery_score": float(row["mastery_score"])}
                for (sid, cid, topic), row in self.topic_mastery.items()
                if sid == student_id and cid == course_id
            ]
            rows_tm.sort(key=lambda r: r["mastery_score"])
            return rows_tm[:3]

        # ── 6. Teacher at-risk complex JOIN query ─────────────────────────
        #    FROM enrollments e JOIN users u … WHERE c.teacher_id = $1
        if "FROM enrollments" in query:
            teacher_id = args[0]
            course_id_filter = args[1] if len(args) >= 2 else None
            rows_ar = [r for r in self.at_risk_rows if r.get("_teacher_id") == teacher_id]
            if course_id_filter:
                rows_ar = [r for r in rows_ar if r["course_id"] == course_id_filter]
            # Strip internal sentinel keys before returning
            return [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows_ar]

        if "SELECT id, course_id, topic, difficulty, quiz_content, questions_json, created_at, updated_at" in query and "FROM teacher_quiz_banks" in query and "WHERE course_id=$1 AND teacher_id=$2" in query:
            course_id, teacher_id = args[0], args[1]
            rows = [
                row for row in self.teacher_quiz_banks
                if row["course_id"] == course_id and row["teacher_id"] == teacher_id
            ]
            rows.sort(key=lambda r: (r["updated_at"], r["created_at"]), reverse=True)
            return rows

        return []


@pytest.fixture()
def fake_learning_db() -> FakeLearningDB:
    return FakeLearningDB()


@pytest.fixture()
def app() -> FastAPI:
    app = FastAPI()
    app.include_router(learning_router, prefix="/api/v1")
    return app


@pytest.fixture()
def student_client(app: FastAPI, monkeypatch: pytest.MonkeyPatch, fake_learning_db: FakeLearningDB) -> TestClient:
    from app.presentation.api.v1 import learning as learning_module

    async def _fake_get_db_conn() -> FakeLearningDB:
        return fake_learning_db

    app.dependency_overrides[get_current_user] = lambda: {"id": "student-1", "role": "student"}
    monkeypatch.setattr(learning_module, "_get_db_conn", _fake_get_db_conn)

    return TestClient(app)


@pytest.fixture()
def teacher_client(app: FastAPI, monkeypatch: pytest.MonkeyPatch, fake_learning_db: FakeLearningDB) -> TestClient:
    from app.presentation.api.v1 import learning as learning_module

    async def _fake_get_db_conn() -> FakeLearningDB:
        return fake_learning_db

    app.dependency_overrides[get_current_user] = lambda: {"id": "teacher-1", "role": "teacher"}
    monkeypatch.setattr(learning_module, "_get_db_conn", _fake_get_db_conn)

    return TestClient(app)


@pytest.fixture()
def seeded_course(fake_learning_db: FakeLearningDB) -> str:
    course_id = f"course-{uuid4()}"
    fake_learning_db.course_subjects[course_id] = "Algebra"
    fake_learning_db.course_names[course_id] = "Algebra Basics"
    fake_learning_db.course_owners[course_id] = "teacher-1"
    return course_id


