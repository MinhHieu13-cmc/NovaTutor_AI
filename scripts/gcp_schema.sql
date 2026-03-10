-- NovaTutor Database Schema for GCP Cloud SQL PostgreSQL
-- PostgreSQL-compatible syntax (not MySQL)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
  password_hash VARCHAR(255),
  google_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(255) PRIMARY KEY,
  teacher_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  voice_config JSONB DEFAULT '{"voice_name": "Zephyr", "language": "en", "speed": 1.0, "pitch": 1.0}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(255) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

-- Backfill missing columns if table existed from an older schema
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS student_id VARCHAR(255);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS course_id VARCHAR(255);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Course documents table
CREATE TABLE IF NOT EXISTS course_documents (
  id VARCHAR(255) PRIMARY KEY,
  course_id VARCHAR(255) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE course_documents ADD COLUMN IF NOT EXISTS course_id VARCHAR(255);
ALTER TABLE course_documents ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE course_documents ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);
ALTER TABLE course_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE course_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_course_documents_course_id ON course_documents(course_id);

-- Learning progress table
CREATE TABLE IF NOT EXISTS learning_progress (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(255) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 100,
  completed_lessons INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS student_id VARCHAR(255);
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS course_id VARCHAR(255);
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 100;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS completed_lessons INTEGER DEFAULT 0;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_learning_progress_student_id ON learning_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_course_id ON learning_progress(course_id);

-- Chat history table (for storing conversations)
CREATE TABLE IF NOT EXISTS chat_history (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(255) REFERENCES courses(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  emotion VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS student_id VARCHAR(255);
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS course_id VARCHAR(255);
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS role VARCHAR(20);
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS emotion VARCHAR(50);
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_chat_history_student_id ON chat_history(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_course_id ON chat_history(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table (for RAG)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL REFERENCES course_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER
);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);

