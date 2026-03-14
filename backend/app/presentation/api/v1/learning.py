"""
Learning Analytics API
Phase 2 foundation: adaptive quiz + student/teacher progress insights.
Phase 3 addition: Teacher Copilot — AI-generated lesson outlines, quiz drafts, announcements.
"""

import json
import os
import random
import re
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal, Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.presentation.api.v1.auth_gcp import get_current_user

router = APIRouter(prefix="/learning", tags=["learning"])

_RAW_DB_URL = os.getenv("DATABASE_URL", "")
DATABASE_URL = _RAW_DB_URL.replace("postgresql+asyncpg://", "postgresql://") if _RAW_DB_URL else None


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]


class GenerateAdaptiveQuizRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None
    session_goal: Optional[str] = None
    question_count: int = Field(default=5, ge=3, le=8)


class GenerateAdaptiveQuizResponse(BaseModel):
    quiz_id: str
    topic: str
    topic_source: Literal["weak_topic", "session_goal", "course_subject", "manual"]
    difficulty: Literal["easy", "medium", "hard"]
    difficulty_reason: str
    question_source: Literal["teacher_bank", "adaptive_template", "hybrid"] = "adaptive_template"
    questions: list[QuizQuestion]


class SubmitAdaptiveQuizRequest(BaseModel):
    quiz_id: str
    answers: list[int]


class SubmitAdaptiveQuizResponse(BaseModel):
    quiz_id: str
    topic: str
    score: float
    correct_count: int
    total_questions: int
    mastery_score: float


class StudentWeeklyScore(BaseModel):
    week_label: str
    score: float


class StudentProgressResponse(BaseModel):
    streak_days: int
    weak_topics: list[str]
    next_suggestion: str
    weekly_scores: list[StudentWeeklyScore]


class AtRiskStudent(BaseModel):
    student_id: str
    student_name: str
    course_id: str
    course_name: str
    avg_score_21d: Optional[float] = None
    last_activity_at: Optional[str] = None
    weak_topic: Optional[str] = None
    risk_level: Literal["high", "medium"]
    reason: str


class TeacherAtRiskResponse(BaseModel):
    students: list[AtRiskStudent]


# ── Phase 3: Teacher Copilot models ─────────────────────────────────────────

class GenerateLessonOutlineRequest(BaseModel):
    course_id: str
    chapter_title: str
    learning_objectives: Optional[str] = None
    audience_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"


class GenerateLessonOutlineResponse(BaseModel):
    chapter_title: str
    outline: str  # Markdown-formatted lesson plan
    estimated_duration_min: int
    grounded_by_docs: bool = False
    context_chunk_count: int = 0


class GenerateQuizContentRequest(BaseModel):
    course_id: str
    topic: str
    question_count: int = Field(default=5, ge=3, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class GenerateQuizContentResponse(BaseModel):
    topic: str
    difficulty: str
    question_count: int
    quiz_content: str  # Markdown with numbered questions + answer key section
    grounded_by_docs: bool = False
    context_chunk_count: int = 0


class PublishQuizBankRequest(BaseModel):
    course_id: str
    topic: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    quiz_content: str


class PublishQuizBankResponse(BaseModel):
    course_id: str
    topic: str
    difficulty: str
    saved_question_count: int
    message: str


class TeacherQuizBankItem(BaseModel):
    id: str
    course_id: str
    topic: str
    difficulty: str
    question_count: int
    quiz_content: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TeacherQuizBankListResponse(BaseModel):
    items: list[TeacherQuizBankItem]


class UpdateQuizBankRequest(BaseModel):
    topic: str
    difficulty: Literal["easy", "medium", "hard"]
    quiz_content: str


class GenerateAnnouncementRequest(BaseModel):
    course_id: str
    subject: str
    tone: Literal["formal", "friendly", "motivational"] = "friendly"
    extra_context: Optional[str] = None


class GenerateAnnouncementResponse(BaseModel):
    subject: str
    tone: str
    announcement: str  # Markdown-formatted announcement ready to review/publish
    grounded_by_docs: bool = False
    context_chunk_count: int = 0


# ── Phase 3: Teacher stats models ────────────────────────────────────────────

class CourseStats(BaseModel):
    course_id: str
    course_name: str
    student_count: int


class TeacherStatsResponse(BaseModel):
    total_courses: int
    total_students: int
    courses: list[CourseStats]


async def _get_db_conn() -> asyncpg.Connection:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")
    try:
        return await asyncpg.connect(DATABASE_URL)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {exc}")


async def _ensure_learning_tables(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS adaptive_quiz_sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            questions_json JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id TEXT PRIMARY KEY,
            quiz_id TEXT REFERENCES adaptive_quiz_sessions(id) ON DELETE SET NULL,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            score NUMERIC(5,2) NOT NULL,
            correct_count INT NOT NULL,
            total_questions INT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS topic_mastery (
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            mastery_score NUMERIC(5,2) NOT NULL,
            last_score NUMERIC(5,2) NOT NULL,
            attempts INT NOT NULL DEFAULT 1,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (student_id, course_id, topic)
        )
        """
    )

    await conn.execute("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON quiz_attempts(course_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created ON quiz_attempts(created_at)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_topic_mastery_student ON topic_mastery(student_id)")

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS teacher_quiz_banks (
            id TEXT PRIMARY KEY,
            teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            quiz_content TEXT,
            questions_json JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    await conn.execute("ALTER TABLE teacher_quiz_banks ADD COLUMN IF NOT EXISTS quiz_content TEXT")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_teacher_quiz_banks_course ON teacher_quiz_banks(course_id)")


async def _verify_course_ownership(
    conn: asyncpg.Connection, course_id: str, teacher_id: str
) -> None:
    """Raise 403 if the teacher does not own this course."""
    row = await conn.fetchrow(
        "SELECT id FROM courses WHERE id=$1 AND teacher_id=$2", course_id, teacher_id
    )
    if not row:
        raise HTTPException(status_code=403, detail="You do not own this course")


async def _get_course_rag_context(
    conn: asyncpg.Connection, course_id: str, max_chunks: int = 6
) -> str:
    """Return up to max_chunks of document text for a course to enrich AI prompts."""
    try:
        rows = await conn.fetch(
            """
            SELECT de.chunk_text
            FROM document_embeddings de
            JOIN course_documents cd ON cd.id = de.document_id
            WHERE cd.course_id = $1
            ORDER BY cd.uploaded_at DESC, de.chunk_index ASC
            LIMIT $2
            """,
            course_id,
            max_chunks,
        )
        chunks = [r["chunk_text"] for r in rows if r.get("chunk_text")]
        return "\n\n---\n\n".join(chunks)
    except Exception:
        return ""


async def _choose_quiz_topic(
    conn: asyncpg.Connection,
    student_id: str,
    course_id: str,
    explicit_topic: Optional[str],
    session_goal: Optional[str],
) -> tuple[str, Literal["weak_topic", "session_goal", "course_subject", "manual"]]:
    if explicit_topic and explicit_topic.strip():
        return explicit_topic.strip(), "manual"

    weak_topic_row = await conn.fetchrow(
        """
        SELECT topic
        FROM topic_mastery
        WHERE student_id=$1 AND course_id=$2
        ORDER BY mastery_score ASC, attempts DESC, updated_at DESC
        LIMIT 1
        """,
        student_id,
        course_id,
    )
    if weak_topic_row and weak_topic_row["topic"]:
        return weak_topic_row["topic"], "weak_topic"

    if session_goal and session_goal.strip():
        normalized_goal = " ".join(session_goal.strip().split())
        return normalized_goal[:120], "session_goal"

    course_row = await conn.fetchrow("SELECT subject FROM courses WHERE id=$1", course_id)
    if not course_row:
        raise HTTPException(status_code=404, detail="Course not found")

    return (course_row["subject"] or "General Topic"), "course_subject"


async def _choose_difficulty(
    conn: asyncpg.Connection,
    student_id: str,
    course_id: str,
    topic: str,
) -> tuple[Literal["easy", "medium", "hard"], str]:
    mastery_row = await conn.fetchrow(
        """
        SELECT mastery_score, attempts
        FROM topic_mastery
        WHERE student_id=$1 AND course_id=$2 AND topic=$3
        """,
        student_id,
        course_id,
        topic,
    )

    recent_rows = await conn.fetch(
        """
        SELECT score
        FROM quiz_attempts
        WHERE student_id=$1 AND course_id=$2 AND topic=$3
        ORDER BY created_at DESC
        LIMIT 6
        """,
        student_id,
        course_id,
        topic,
    )

    mastery_score = float(mastery_row["mastery_score"]) if mastery_row else None
    attempts = int(mastery_row["attempts"]) if mastery_row else 0
    recent_scores = [float(row["score"]) for row in recent_rows]

    if not recent_scores and mastery_score is None:
        return "medium", "No historical data yet, start at medium"

    recent_avg = sum(recent_scores) / len(recent_scores) if recent_scores else mastery_score or 0.0

    trend = 0.0
    if len(recent_scores) >= 4:
        newer = recent_scores[:3]
        older = recent_scores[-3:]
        trend = (sum(newer) / len(newer)) - (sum(older) / len(older))

    if recent_avg < 50 or (mastery_score is not None and mastery_score < 45):
        return "easy", "Recent results indicate foundational reinforcement is needed"

    if recent_avg >= 80 and trend >= 5 and attempts >= 2:
        return "hard", "Strong recent performance and upward trend detected"

    if mastery_score is not None and mastery_score >= 75 and recent_avg >= 70:
        return "hard", "Mastery is stable, increasing challenge level"

    return "medium", "Balanced challenge based on current mastery"


def _build_quiz_questions(topic: str, difficulty: str, question_count: int) -> list[dict[str, Any]]:
    verbs = {
        "easy": ["identify", "recognize", "explain"],
        "medium": ["compare", "apply", "analyze"],
        "hard": ["evaluate", "optimize", "design"],
    }
    stems = {
        "easy": [
            f"What is the core idea of {topic}?",
            f"Which statement best describes {topic}?",
            f"What is a common use case of {topic}?",
            f"Which concept is most closely related to {topic}?",
        ],
        "medium": [
            f"How would you apply {topic} to solve a practical task?",
            f"When comparing approaches in {topic}, what should be prioritized first?",
            f"What is the best way to validate results in {topic}?",
            f"What trade-off appears most often in {topic}?",
        ],
        "hard": [
            f"How would you design a robust workflow using {topic} under constraints?",
            f"Which strategy most improves reliability when scaling {topic}?",
            f"What is the most defensible decision when performance and quality conflict in {topic}?",
            f"How should you optimize a pipeline centered on {topic}?",
        ],
    }
    distractors = [
        "Choose the fastest shortcut without verification",
        "Ignore edge cases and focus only on average examples",
        "Rely on assumptions instead of measurable criteria",
    ]

    rng = random.Random(f"{topic}:{difficulty}:{question_count}")
    question_pool = stems[difficulty].copy()
    rng.shuffle(question_pool)

    questions: list[dict[str, Any]] = []
    for idx in range(question_count):
        prompt = question_pool[idx % len(question_pool)]
        action = rng.choice(verbs[difficulty])
        correct = f"{action.title()} using evidence, clear criteria, and feedback loops"
        options = [
            correct,
            distractors[0],
            distractors[1],
            distractors[2],
        ]
        rng.shuffle(options)
        questions.append(
            {
                "id": f"q{idx + 1}",
                "question": prompt,
                "options": options,
                "correct_index": options.index(correct),
            }
        )

    return questions


def _parse_quiz_markdown_to_questions(quiz_content: str) -> list[dict[str, Any]]:
    """Extract structured questions + options + correct index from teacher markdown quiz draft."""
    answer_map: dict[int, str] = {}
    for match in re.finditer(r"^\|\s*Q?(\d+)\s*\|\s*([A-D])\s*\|", quiz_content, re.MULTILINE):
        answer_map[int(match.group(1))] = match.group(2)

    questions: list[dict[str, Any]] = []
    q_pattern = re.compile(r"\*\*Q(\d+)\.\*\*\s*(.+?)(?=\n\*\*Q\d+\.\*\*|\n---|\Z)", re.DOTALL)
    opt_pattern = re.compile(r"^\s*-\s*([A-D])\)\s*(.+)$", re.MULTILINE)

    for q_match in q_pattern.finditer(quiz_content):
        q_num = int(q_match.group(1))
        block = q_match.group(2).strip()
        lines = [line for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        question_text = lines[0].strip()
        options_by_letter: dict[str, str] = {}
        for o_match in opt_pattern.finditer(block):
            options_by_letter[o_match.group(1)] = o_match.group(2).strip()

        ordered_letters = [letter for letter in ["A", "B", "C", "D"] if letter in options_by_letter]
        if len(ordered_letters) < 2:
            continue

        options = [options_by_letter[letter] for letter in ordered_letters]
        correct_letter = answer_map.get(q_num, ordered_letters[0])
        correct_index = ordered_letters.index(correct_letter) if correct_letter in ordered_letters else 0

        questions.append(
            {
                "id": f"tq{q_num}",
                "question": question_text,
                "options": options,
                "correct_index": correct_index,
            }
        )

    return questions


async def _save_teacher_quiz_bank(
    conn: asyncpg.Connection,
    teacher_id: str,
    course_id: str,
    topic: str,
    difficulty: str,
    questions: list[dict[str, Any]],
    quiz_content: Optional[str] = None,
) -> None:
    if not questions:
        return
    await conn.execute(
        """
        INSERT INTO teacher_quiz_banks (id, teacher_id, course_id, topic, difficulty, quiz_content, questions_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        """,
        str(uuid4()),
        teacher_id,
        course_id,
        topic,
        difficulty,
        quiz_content,
        json.dumps(questions),
    )


async def _load_teacher_quiz_bank_questions(
    conn: asyncpg.Connection,
    course_id: str,
    topic: str,
    question_count: int,
) -> list[dict[str, Any]]:
    row = await conn.fetchrow(
        """
        SELECT questions_json
        FROM teacher_quiz_banks
        WHERE course_id=$1 AND lower(topic)=lower($2)
        ORDER BY created_at DESC
        LIMIT 1
        """,
        course_id,
        topic,
    )
    if not row:
        row = await conn.fetchrow(
            """
            SELECT questions_json
            FROM teacher_quiz_banks
            WHERE course_id=$1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            course_id,
        )
    if not row:
        return []

    questions = row["questions_json"]
    if isinstance(questions, str):
        questions = json.loads(questions)
    if not isinstance(questions, list) or not questions:
        return []

    normalized = [
        {
            "id": str(item.get("id", f"tq{idx + 1}")),
            "question": str(item.get("question", "")).strip(),
            "options": [str(opt) for opt in (item.get("options") or [])],
            "correct_index": int(item.get("correct_index", 0)),
        }
        for idx, item in enumerate(questions)
        if isinstance(item, dict)
    ]
    normalized = [q for q in normalized if q["question"] and len(q["options"]) >= 2]
    if not normalized:
        return []

    random.shuffle(normalized)
    picked = normalized[:question_count]
    for idx, q in enumerate(picked):
        q["id"] = f"q{idx + 1}"
    return picked


def _calculate_streak_days(activity_dates: list[date]) -> int:
    if not activity_dates:
        return 0

    unique_desc = sorted(set(activity_dates), reverse=True)
    today = datetime.now(timezone.utc).date()
    if unique_desc[0] not in {today, today - timedelta(days=1)}:
        return 0

    streak = 1
    for idx in range(1, len(unique_desc)):
        if unique_desc[idx - 1] - unique_desc[idx] == timedelta(days=1):
            streak += 1
        else:
            break
    return streak


@router.post("/quiz/generate", response_model=GenerateAdaptiveQuizResponse)
async def generate_adaptive_quiz(
    request: GenerateAdaptiveQuizRequest,
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can generate quizzes")

    user_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)

        topic, topic_source = await _choose_quiz_topic(
            conn=conn,
            student_id=user_id,
            course_id=request.course_id,
            explicit_topic=request.topic,
            session_goal=request.session_goal,
        )
        difficulty, difficulty_reason = await _choose_difficulty(
            conn=conn,
            student_id=user_id,
            course_id=request.course_id,
            topic=topic,
        )

        teacher_questions = await _load_teacher_quiz_bank_questions(
            conn=conn,
            course_id=request.course_id,
            topic=topic,
            question_count=request.question_count,
        )
        if teacher_questions:
            questions = teacher_questions
            if len(questions) < request.question_count:
                needed = request.question_count - len(questions)
                extra = _build_quiz_questions(topic=topic, difficulty=difficulty, question_count=needed)
                for idx, q in enumerate(extra, start=len(questions) + 1):
                    q["id"] = f"q{idx}"
                questions.extend(extra)
                question_source = "hybrid"
            else:
                question_source = "teacher_bank"
        else:
            questions = _build_quiz_questions(topic=topic, difficulty=difficulty, question_count=request.question_count)
            question_source = "adaptive_template"

        quiz_id = str(uuid4())
        await conn.execute(
            """
            INSERT INTO adaptive_quiz_sessions (id, student_id, course_id, topic, difficulty, questions_json)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            """,
            quiz_id,
            user_id,
            request.course_id,
            topic,
            difficulty,
            json.dumps(questions),
        )

        return GenerateAdaptiveQuizResponse(
            quiz_id=quiz_id,
            topic=topic,
            topic_source=topic_source,
            difficulty=difficulty,
            difficulty_reason=difficulty_reason,
            question_source=question_source,
            questions=[QuizQuestion(id=q["id"], question=q["question"], options=q["options"]) for q in questions],
        )
    finally:
        await conn.close()


@router.post("/quiz/submit", response_model=SubmitAdaptiveQuizResponse)
async def submit_adaptive_quiz(
    request: SubmitAdaptiveQuizRequest,
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit quizzes")

    user_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)

        session = await conn.fetchrow(
            """
            SELECT id, student_id, course_id, topic, questions_json
            FROM adaptive_quiz_sessions
            WHERE id=$1
            """,
            request.quiz_id,
        )
        if not session or session["student_id"] != user_id:
            raise HTTPException(status_code=404, detail="Quiz session not found")

        questions = session["questions_json"]
        if isinstance(questions, str):
            questions = json.loads(questions)

        total = len(questions)
        if total == 0:
            raise HTTPException(status_code=400, detail="Quiz has no questions")

        answers = request.answers[:total]
        correct_count = 0
        for idx, question in enumerate(questions):
            if idx < len(answers) and int(answers[idx]) == int(question.get("correct_index", -1)):
                correct_count += 1

        score = round((correct_count / total) * 100, 2)

        await conn.execute(
            """
            INSERT INTO quiz_attempts (id, quiz_id, student_id, course_id, topic, score, correct_count, total_questions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            str(uuid4()),
            request.quiz_id,
            user_id,
            session["course_id"],
            session["topic"],
            score,
            correct_count,
            total,
        )

        existing_mastery = await conn.fetchrow(
            """
            SELECT mastery_score, attempts
            FROM topic_mastery
            WHERE student_id=$1 AND course_id=$2 AND topic=$3
            """,
            user_id,
            session["course_id"],
            session["topic"],
        )

        if existing_mastery:
            prev_mastery = float(existing_mastery["mastery_score"])
            attempts = int(existing_mastery["attempts"]) + 1
            mastery_score = round((prev_mastery * 0.7) + (score * 0.3), 2)
            await conn.execute(
                """
                UPDATE topic_mastery
                SET mastery_score=$1, last_score=$2, attempts=$3, updated_at=NOW()
                WHERE student_id=$4 AND course_id=$5 AND topic=$6
                """,
                mastery_score,
                score,
                attempts,
                user_id,
                session["course_id"],
                session["topic"],
            )
        else:
            mastery_score = score
            await conn.execute(
                """
                INSERT INTO topic_mastery (student_id, course_id, topic, mastery_score, last_score, attempts)
                VALUES ($1, $2, $3, $4, $5, 1)
                """,
                user_id,
                session["course_id"],
                session["topic"],
                mastery_score,
                score,
            )

        return SubmitAdaptiveQuizResponse(
            quiz_id=request.quiz_id,
            topic=session["topic"],
            score=score,
            correct_count=correct_count,
            total_questions=total,
            mastery_score=mastery_score,
        )
    finally:
        await conn.close()


@router.get("/student/progress", response_model=StudentProgressResponse)
async def get_student_progress(
    course_id: Optional[str] = Query(default=None),
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    user_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)

        if course_id:
            weekly_rows = await conn.fetch(
                """
                SELECT date_trunc('week', created_at)::date AS week_start, AVG(score) AS avg_score
                FROM quiz_attempts
                WHERE student_id=$1 AND course_id=$2 AND created_at >= NOW() - INTERVAL '8 weeks'
                GROUP BY week_start
                ORDER BY week_start ASC
                """,
                user_id,
                course_id,
            )
            weak_rows = await conn.fetch(
                """
                SELECT topic, mastery_score
                FROM topic_mastery
                WHERE student_id=$1 AND course_id=$2
                ORDER BY mastery_score ASC
                LIMIT 3
                """,
                user_id,
                course_id,
            )
            activity_rows = await conn.fetch(
                """
                SELECT created_at::date AS activity_date
                FROM quiz_attempts
                WHERE student_id=$1 AND course_id=$2
                ORDER BY activity_date DESC
                LIMIT 30
                """,
                user_id,
                course_id,
            )
        else:
            weekly_rows = await conn.fetch(
                """
                SELECT date_trunc('week', created_at)::date AS week_start, AVG(score) AS avg_score
                FROM quiz_attempts
                WHERE student_id=$1 AND created_at >= NOW() - INTERVAL '8 weeks'
                GROUP BY week_start
                ORDER BY week_start ASC
                """,
                user_id,
            )
            weak_rows = await conn.fetch(
                """
                SELECT topic, AVG(mastery_score) AS avg_mastery
                FROM topic_mastery
                WHERE student_id=$1
                GROUP BY topic
                ORDER BY avg_mastery ASC
                LIMIT 3
                """,
                user_id,
            )
            activity_rows = await conn.fetch(
                """
                SELECT created_at::date AS activity_date
                FROM quiz_attempts
                WHERE student_id=$1
                ORDER BY activity_date DESC
                LIMIT 30
                """,
                user_id,
            )

        weekly_scores = [
            StudentWeeklyScore(week_label=row["week_start"].strftime("%d/%m"), score=round(float(row["avg_score"]), 1))
            for row in weekly_rows
        ]
        weak_topics = [row["topic"] for row in weak_rows if row["topic"]]
        streak_days = _calculate_streak_days([row["activity_date"] for row in activity_rows])

        if weak_topics:
            next_suggestion = f"Focus on {weak_topics[0]} with one 10-minute practice session today."
        elif weekly_scores:
            next_suggestion = "Great progress. Try a harder quiz to keep improving."
        else:
            next_suggestion = "Start with a quick adaptive quiz to build your first progress snapshot."

        return StudentProgressResponse(
            streak_days=streak_days,
            weak_topics=weak_topics,
            next_suggestion=next_suggestion,
            weekly_scores=weekly_scores,
        )
    finally:
        await conn.close()


@router.get("/teacher/at-risk", response_model=TeacherAtRiskResponse)
async def get_teacher_at_risk_students(
    course_id: Optional[str] = Query(default=None),
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

    teacher_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)

        course_filter_sql = "AND c.id = $2" if course_id else ""
        if course_id:
            rows = await conn.fetch(
                f"""
                SELECT
                    u.id AS student_id,
                    u.full_name AS student_name,
                    c.id AS course_id,
                    c.name AS course_name,
                    AVG(CASE WHEN qa.created_at >= NOW() - INTERVAL '21 days' THEN qa.score END) AS avg_score_21d,
                    MAX(qa.created_at) AS last_activity_at,
                    (
                        SELECT tm.topic
                        FROM topic_mastery tm
                        WHERE tm.student_id = u.id AND tm.course_id = c.id
                        ORDER BY tm.mastery_score ASC
                        LIMIT 1
                    ) AS weak_topic
                FROM enrollments e
                JOIN users u ON u.id = e.student_id
                JOIN courses c ON c.id = e.course_id
                LEFT JOIN quiz_attempts qa ON qa.student_id = u.id AND qa.course_id = c.id
                WHERE c.teacher_id = $1 {course_filter_sql}
                GROUP BY u.id, u.full_name, c.id, c.name
                ORDER BY last_activity_at NULLS FIRST, avg_score_21d NULLS FIRST
                """,
                teacher_id,
                course_id,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT
                    u.id AS student_id,
                    u.full_name AS student_name,
                    c.id AS course_id,
                    c.name AS course_name,
                    AVG(CASE WHEN qa.created_at >= NOW() - INTERVAL '21 days' THEN qa.score END) AS avg_score_21d,
                    MAX(qa.created_at) AS last_activity_at,
                    (
                        SELECT tm.topic
                        FROM topic_mastery tm
                        WHERE tm.student_id = u.id AND tm.course_id = c.id
                        ORDER BY tm.mastery_score ASC
                        LIMIT 1
                    ) AS weak_topic
                FROM enrollments e
                JOIN users u ON u.id = e.student_id
                JOIN courses c ON c.id = e.course_id
                LEFT JOIN quiz_attempts qa ON qa.student_id = u.id AND qa.course_id = c.id
                WHERE c.teacher_id = $1
                GROUP BY u.id, u.full_name, c.id, c.name
                ORDER BY last_activity_at NULLS FIRST, avg_score_21d NULLS FIRST
                """,
                teacher_id,
            )

        risk_students: list[AtRiskStudent] = []
        for row in rows:
            avg_score = float(row["avg_score_21d"]) if row["avg_score_21d"] is not None else None
            last_activity = row["last_activity_at"]

            if avg_score is None:
                risk_level = "high"
                reason = "No quiz attempts in this course yet"
            elif avg_score < 55:
                risk_level = "high"
                reason = "Average quiz score in 21 days is below 55"
            elif avg_score < 70:
                risk_level = "medium"
                reason = "Average quiz score in 21 days is below 70"
            else:
                continue

            risk_students.append(
                AtRiskStudent(
                    student_id=row["student_id"],
                    student_name=row["student_name"],
                    course_id=row["course_id"],
                    course_name=row["course_name"],
                    avg_score_21d=round(avg_score, 1) if avg_score is not None else None,
                    last_activity_at=last_activity.isoformat() if last_activity else None,
                    weak_topic=row["weak_topic"],
                    risk_level=risk_level,
                    reason=reason,
                )
            )

        return TeacherAtRiskResponse(students=risk_students)
    finally:
        await conn.close()


# ── Phase 3: Teacher Copilot helpers ────────────────────────────────────────

def _copilot_gemini_key() -> str | None:
    return settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY")


def _copilot_extract_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""
    parts = candidates[0].get("content", {}).get("parts", [])
    return "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()


def _copilot_call_gemini(prompt: str, api_key: str, temperature: float = 0.6, max_tokens: int = 2048) -> str:
    """Synchronous Gemini REST call (reuses same pattern as rag.py)."""
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    req = urllib.request.Request(
        url=(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash:generateContent?key={api_key}"
        ),
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return _copilot_extract_text(json.loads(resp.read().decode("utf-8")))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {detail}")


def _teacher_quiz_bank_row_to_item(row: Any) -> TeacherQuizBankItem:
    data = dict(row)
    questions = data["questions_json"]
    if isinstance(questions, str):
        questions = json.loads(questions)
    if not isinstance(questions, list):
        questions = []
    return TeacherQuizBankItem(
        id=data["id"],
        course_id=data["course_id"],
        topic=data["topic"],
        difficulty=data["difficulty"],
        question_count=len(questions),
        quiz_content=data.get("quiz_content") or "",
        created_at=data["created_at"].isoformat() if data.get("created_at") else None,
        updated_at=data["updated_at"].isoformat() if data.get("updated_at") else None,
    )


# ── Phase 3: Teacher Copilot endpoints ──────────────────────────────────────

@router.post("/teacher/generate-lesson-outline", response_model=GenerateLessonOutlineResponse)
async def generate_lesson_outline(
    request: GenerateLessonOutlineRequest,
    authorization: dict = Depends(get_current_user),
):
    """
    Phase 3 Teacher Copilot: AI generates a structured lesson outline for a chapter.
    Teacher reviews/edits before publishing. <= 1 min per module target.
    """
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can use Teacher Copilot")

    api_key = _copilot_gemini_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured")

    teacher_id = authorization.get("id")
    course_name = request.course_id
    rag_context = ""
    rag_context = ""

    conn = await _get_db_conn()
    try:
        # P0: Verify ownership
        await _verify_course_ownership(conn, request.course_id, teacher_id)

        row = await conn.fetchrow("SELECT name, subject FROM courses WHERE id=$1", request.course_id)
        if row:
            course_name = f"{row['name']} ({row['subject']})"

        # P2: Fetch document context to enrich prompt
        rag_context = await _get_course_rag_context(conn, request.course_id)
    finally:
        await conn.close()

    objectives_line = (
        f"Learning objectives: {request.learning_objectives}"
        if request.learning_objectives
        else "No specific objectives provided — infer from chapter title."
    )

    rag_section = (
        f"\n\n## 📄 Relevant Course Material (use this as factual context)\n\n{rag_context}"
        if rag_context
        else ""
    )

    prompt = f"""You are an expert instructional designer creating lesson plans for online courses.

Course: {course_name}
Chapter title: {request.chapter_title}
Audience level: {request.audience_level}
{objectives_line}{rag_section}

Create a detailed, ready-to-use lesson outline in **Markdown** format with these sections:

## {request.chapter_title}

### 🎯 Learning Objectives
(3-5 measurable bullet points)

### 📋 Lesson Structure
| # | Activity | Duration | Method |
|---|----------|----------|--------|
(Fill with realistic time estimates, total should be 45-90 min)

### 📖 Key Concepts
(Numbered list of the 4-6 most important concepts students must master)

### 🏋️ Practice Activities
(2-3 hands-on activities or exercises with brief instructions)

### ✅ Assessment Checkpoints
(2-3 short checks to verify understanding before moving on)

### 📚 Recommended Resources
(2-3 types of supplementary materials)

Be specific, practical, and engaging. Use clear language appropriate for {request.audience_level} learners.
{"Ground your outline in the course material provided above." if rag_context else ""}
Output ONLY the Markdown lesson plan, no preamble."""

    outline_text = _copilot_call_gemini(prompt, api_key)
    if not outline_text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response")

    estimated_min = 60
    lines = outline_text.splitlines()
    activity_rows = [l for l in lines if l.strip().startswith("|") and "---" not in l and "#" not in l]
    if len(activity_rows) > 2:
        estimated_min = min(90, max(30, (len(activity_rows) - 1) * 12))

    return GenerateLessonOutlineResponse(
        chapter_title=request.chapter_title,
        outline=outline_text,
        estimated_duration_min=estimated_min,
        grounded_by_docs=bool(rag_context.strip()),
        context_chunk_count=(0 if not rag_context.strip() else len([c for c in rag_context.split("\n\n---\n\n") if c.strip()])),
    )


@router.post("/teacher/generate-quiz-content", response_model=GenerateQuizContentResponse)
async def generate_quiz_content(
    request: GenerateQuizContentRequest,
    authorization: dict = Depends(get_current_user),
):
    """
    Phase 3 Teacher Copilot: AI drafts quiz questions for a topic.
    Includes an answer key section. Teacher reviews before publishing.
    """
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can use Teacher Copilot")

    api_key = _copilot_gemini_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured")

    teacher_id = authorization.get("id")
    rag_context = ""

    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)
        await _verify_course_ownership(conn, request.course_id, teacher_id)
        rag_context = await _get_course_rag_context(conn, request.course_id)
    finally:
        await conn.close()

    difficulty_guide = {
        "easy": "recall and basic understanding (Bloom's: Remember/Understand)",
        "medium": "application and analysis (Bloom's: Apply/Analyze)",
        "hard": "evaluation and synthesis (Bloom's: Evaluate/Create)",
    }

    rag_section = (
        f"\n\n## 📄 Course Material Context (base questions on this content)\n\n{rag_context}"
        if rag_context
        else ""
    )

    prompt = f"""You are an expert quiz author for online education.

Topic: {request.topic}
Difficulty: {request.difficulty} — {difficulty_guide[request.difficulty]}
Number of questions: {request.question_count}{rag_section}

Generate a complete quiz in **Markdown** format:

## Quiz: {request.topic} ({request.difficulty.title()})

For each question use this format:
**Q1.** [question text]
- A) [option]
- B) [option]
- C) [option]
- D) [option]

(repeat for all {request.question_count} questions)

---

## ✅ Answer Key

| Q | Answer | Brief Explanation |
|---|--------|-------------------|
(one row per question, e.g. "Q1 | B | Because...")

Rules:
- Questions must be clear and unambiguous.
- All 4 options should be plausible — avoid obviously wrong distractors.
- Each question must have exactly one correct answer.
- Explanations in the answer key should be 1 sentence max.
{"- Base questions on the course material provided above when relevant." if rag_context else ""}
Output ONLY the Markdown quiz, no preamble."""

    quiz_text = _copilot_call_gemini(prompt, api_key)
    if not quiz_text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response")

    parsed_questions = _parse_quiz_markdown_to_questions(quiz_text)
    if parsed_questions:
        save_conn = await _get_db_conn()
        try:
            await _ensure_learning_tables(save_conn)
            await _save_teacher_quiz_bank(
                conn=save_conn,
                teacher_id=teacher_id,
                course_id=request.course_id,
                topic=request.topic,
                difficulty=request.difficulty,
                questions=parsed_questions,
                quiz_content=quiz_text,
            )
        finally:
            await save_conn.close()

    return GenerateQuizContentResponse(
        topic=request.topic,
        difficulty=request.difficulty,
        question_count=request.question_count,
        quiz_content=quiz_text,
        grounded_by_docs=bool(rag_context.strip()),
        context_chunk_count=(0 if not rag_context.strip() else len([c for c in rag_context.split("\n\n---\n\n") if c.strip()])),
    )


@router.post("/teacher/generate-announcement", response_model=GenerateAnnouncementResponse)
async def generate_announcement(
    request: GenerateAnnouncementRequest,
    authorization: dict = Depends(get_current_user),
):
    """
    Phase 3 Teacher Copilot: AI drafts a course announcement.
    Teacher reviews and edits before posting.
    """
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can use Teacher Copilot")

    api_key = _copilot_gemini_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured")

    teacher_id = authorization.get("id")
    course_name = request.course_id

    conn = await _get_db_conn()
    try:
        await _verify_course_ownership(conn, request.course_id, teacher_id)
        row = await conn.fetchrow("SELECT name FROM courses WHERE id=$1", request.course_id)
        if row:
            course_name = row["name"]
        rag_context = await _get_course_rag_context(conn, request.course_id)
    finally:
        await conn.close()

    tone_guide = {
        "formal": "professional and formal — use complete sentences, avoid contractions",
        "friendly": "warm and conversational — use 'you', light encouragement",
        "motivational": "energetic and inspiring — use action verbs, build excitement",
    }
    extra = f"\nAdditional context: {request.extra_context}" if request.extra_context else ""
    rag_section = (
        f"\n\n## 📄 Course Material Context (reflect this context in the announcement)\n\n{rag_context}"
        if rag_context
        else ""
    )

    prompt = f"""You are a course instructor writing an announcement for your students.

Course: {course_name}
Announcement subject: {request.subject}
Tone: {request.tone} — {tone_guide[request.tone]}{extra}{rag_section}

Write a concise, engaging course announcement in **Markdown** format:

## 📢 {request.subject}

[Opening sentence that grabs attention]

[Main body: 2-3 short paragraphs covering what students need to know, any action required, and timeline if relevant]

[Closing sentence with encouragement or next step]

---
*Posted by your instructor — {course_name}*

Rules:
- Keep total length under 250 words.
- Use bullet points only if listing 3+ items.
- Match the {request.tone} tone throughout.
{"- Reflect concrete details from the course material context when available." if rag_context else ""}
Output ONLY the Markdown announcement, no preamble."""

    announcement_text = _copilot_call_gemini(prompt, api_key)
    if not announcement_text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response")

    return GenerateAnnouncementResponse(
        subject=request.subject,
        tone=request.tone,
        announcement=announcement_text,
        grounded_by_docs=bool(rag_context.strip()),
        context_chunk_count=(0 if not rag_context.strip() else len([c for c in rag_context.split("\n\n---\n\n") if c.strip()])),
    )


@router.post("/teacher/quiz-bank/publish", response_model=PublishQuizBankResponse)
async def publish_quiz_bank(
    request: PublishQuizBankRequest,
    authorization: dict = Depends(get_current_user),
):
    """Publish teacher-edited markdown quiz content into the per-course quiz bank."""
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can publish course quiz banks")

    teacher_id = authorization.get("id")
    parsed_questions = _parse_quiz_markdown_to_questions(request.quiz_content)
    if not parsed_questions:
        raise HTTPException(
            status_code=400,
            detail="Could not parse quiz markdown into structured questions. Please keep Q1/A-D/Answer Key format.",
        )

    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)
        await _verify_course_ownership(conn, request.course_id, teacher_id)
        await _save_teacher_quiz_bank(
            conn=conn,
            teacher_id=teacher_id,
            course_id=request.course_id,
            topic=request.topic,
            difficulty=request.difficulty,
            questions=parsed_questions,
            quiz_content=request.quiz_content,
        )
    finally:
        await conn.close()

    return PublishQuizBankResponse(
        course_id=request.course_id,
        topic=request.topic,
        difficulty=request.difficulty,
        saved_question_count=len(parsed_questions),
        message="Quiz bank published successfully",
    )


@router.get("/teacher/quiz-bank", response_model=TeacherQuizBankListResponse)
async def list_teacher_quiz_banks(
    course_id: str = Query(...),
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access course quiz banks")

    teacher_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)
        await _verify_course_ownership(conn, course_id, teacher_id)
        rows = await conn.fetch(
            """
            SELECT id, course_id, topic, difficulty, quiz_content, questions_json, created_at, updated_at
            FROM teacher_quiz_banks
            WHERE course_id=$1 AND teacher_id=$2
            ORDER BY updated_at DESC, created_at DESC
            """,
            course_id,
            teacher_id,
        )
        return TeacherQuizBankListResponse(items=[_teacher_quiz_bank_row_to_item(row) for row in rows])
    finally:
        await conn.close()


@router.put("/teacher/quiz-bank/{bank_id}", response_model=TeacherQuizBankItem)
async def update_teacher_quiz_bank(
    bank_id: str,
    request: UpdateQuizBankRequest,
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update course quiz banks")

    teacher_id = authorization.get("id")
    parsed_questions = _parse_quiz_markdown_to_questions(request.quiz_content)
    if not parsed_questions:
        raise HTTPException(
            status_code=400,
            detail="Could not parse quiz markdown into structured questions. Please keep Q1/A-D/Answer Key format.",
        )

    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)
        existing = await conn.fetchrow(
            "SELECT id, course_id, teacher_id FROM teacher_quiz_banks WHERE id=$1",
            bank_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Quiz bank not found")
        if existing["teacher_id"] != teacher_id:
            raise HTTPException(status_code=403, detail="You do not own this course")

        await _verify_course_ownership(conn, existing["course_id"], teacher_id)
        await conn.execute(
            """
            UPDATE teacher_quiz_banks
            SET topic=$1, difficulty=$2, quiz_content=$3, questions_json=$4::jsonb, updated_at=NOW()
            WHERE id=$5
            """,
            request.topic,
            request.difficulty,
            request.quiz_content,
            json.dumps(parsed_questions),
            bank_id,
        )
        updated = await conn.fetchrow(
            """
            SELECT id, course_id, topic, difficulty, quiz_content, questions_json, created_at, updated_at
            FROM teacher_quiz_banks
            WHERE id=$1
            """,
            bank_id,
        )
        return _teacher_quiz_bank_row_to_item(updated)
    finally:
        await conn.close()


@router.delete("/teacher/quiz-bank/{bank_id}")
async def delete_teacher_quiz_bank(
    bank_id: str,
    authorization: dict = Depends(get_current_user),
):
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete course quiz banks")

    teacher_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        await _ensure_learning_tables(conn)
        existing = await conn.fetchrow(
            "SELECT id, course_id, teacher_id FROM teacher_quiz_banks WHERE id=$1",
            bank_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Quiz bank not found")
        if existing["teacher_id"] != teacher_id:
            raise HTTPException(status_code=403, detail="You do not own this course")

        await conn.execute("DELETE FROM teacher_quiz_banks WHERE id=$1", bank_id)
        return {"message": "Quiz bank deleted successfully", "id": bank_id}
    finally:
        await conn.close()


@router.get("/teacher/stats", response_model=TeacherStatsResponse)
async def get_teacher_stats(
    authorization: dict = Depends(get_current_user),
):
    """Phase 3: Real enrollment counts per course for the teacher dashboard."""
    if authorization.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

    teacher_id = authorization.get("id")
    conn = await _get_db_conn()
    try:
        rows = await conn.fetch(
            """
            SELECT
                c.id AS course_id,
                c.name AS course_name,
                COUNT(DISTINCT e.student_id) AS student_count
            FROM courses c
            LEFT JOIN enrollments e ON e.course_id = c.id
            WHERE c.teacher_id = $1
            GROUP BY c.id, c.name
            ORDER BY c.created_at DESC
            """,
            teacher_id,
        )
        courses_stats = [
            CourseStats(
                course_id=r["course_id"],
                course_name=r["course_name"],
                student_count=int(r["student_count"]),
            )
            for r in rows
        ]
        total_students = sum(cs.student_count for cs in courses_stats)
        return TeacherStatsResponse(
            total_courses=len(courses_stats),
            total_students=total_students,
            courses=courses_stats,
        )
    finally:
        await conn.close()


