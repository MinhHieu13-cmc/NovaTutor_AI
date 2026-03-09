from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from typing import Dict, Any

Base = declarative_base()

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    grade_level = Column(String)
    learning_style = Column(String)  # visual, auditory, kinesthetic
    strengths = Column(JSON)  # list of subjects
    weaknesses = Column(JSON)  # list of subjects
    preferences = Column(JSON)  # learning preferences
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"))
    subject = Column(String)
    topic = Column(String)
    duration_minutes = Column(Integer)
    transcript = Column(Text)
    summary = Column(Text)
    learning_outcomes = Column(JSON)  # what was learned
    assessment_score = Column(Float)  # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    role = Column(String)  # user, assistant
    content = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    meta_data = Column(JSON)  # emotion, confidence, etc.

class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"))
    subject = Column(String)
    topic = Column(String)
    mastery_level = Column(Float)  # 0-1
    last_practiced = Column(DateTime(timezone=True))
    next_review = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
