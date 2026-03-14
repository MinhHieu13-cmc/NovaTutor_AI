-- ============================================================
-- NovaTutor AI — Local DB Init
-- Chạy 1 lần sau khi docker compose up lần đầu:
--   docker exec -i novatutor_db psql -U postgres -d novatutor < scripts/init_db.sql
-- ============================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            TEXT        PRIMARY KEY,
    email         TEXT        UNIQUE NOT NULL,
    full_name     TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'student',
    password_hash TEXT,
    google_id     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Courses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    id           TEXT        PRIMARY KEY,
    teacher_id   TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    description  TEXT,
    subject      TEXT,
    voice_config JSONB       NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);

-- ─── Enrollments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
    id         TEXT        PRIMARY KEY,
    student_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, course_id)
);

-- ─── Course Documents ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_documents (
    id            TEXT        PRIMARY KEY,
    course_id     TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    document_url  TEXT        NOT NULL,
    document_name TEXT        NOT NULL,
    document_type TEXT,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AI Lab Sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_lab_sessions (
    id         TEXT        PRIMARY KEY,
    student_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  TEXT        REFERENCES courses(id) ON DELETE SET NULL,
    title      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_lab_sessions_student_id
    ON ai_lab_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_ai_lab_sessions_course_id
    ON ai_lab_sessions (course_id);

-- ─── Chat History (Resume Conversation) ─────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
    id         TEXT        PRIMARY KEY,
    student_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  TEXT        REFERENCES courses(id) ON DELETE SET NULL,
    session_id TEXT,
    message    TEXT        NOT NULL,
    role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    emotion    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_history_student_id
    ON chat_history (student_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_course_id
    ON chat_history (course_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_session_id
    ON chat_history (session_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_created_at
    ON chat_history (created_at);

-- ─── Phase 2: Adaptive Quiz + Mastery ──────────────────────
CREATE TABLE IF NOT EXISTS adaptive_quiz_sessions (
    id             TEXT        PRIMARY KEY,
    student_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id      TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic          TEXT        NOT NULL,
    difficulty     TEXT        NOT NULL,
    questions_json JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              TEXT        PRIMARY KEY,
    quiz_id         TEXT        REFERENCES adaptive_quiz_sessions(id) ON DELETE SET NULL,
    student_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic           TEXT        NOT NULL,
    score           NUMERIC(5,2) NOT NULL,
    correct_count   INT         NOT NULL,
    total_questions INT         NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_mastery (
    student_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id     TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic         TEXT        NOT NULL,
    mastery_score NUMERIC(5,2) NOT NULL,
    last_score    NUMERIC(5,2) NOT NULL,
    attempts      INT         NOT NULL DEFAULT 1,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, course_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
    ON quiz_attempts (student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course
    ON quiz_attempts (course_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created
    ON quiz_attempts (created_at);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_student
    ON topic_mastery (student_id);

-- ─── Document Embeddings (pgvector) ──────────────────────────
CREATE TABLE IF NOT EXISTS document_embeddings (
    id          TEXT    PRIMARY KEY,
    document_id TEXT    NOT NULL REFERENCES course_documents(id) ON DELETE CASCADE,
    chunk_text  TEXT    NOT NULL,
    embedding   vector(768),
    chunk_index INT     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_document_id
    ON document_embeddings (document_id);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_vector
    ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Done
SELECT 'NovaTutor DB initialized ✓' AS status;
