from datetime import datetime, timezone

from conftest import FakeLearningDB


def test_generate_quiz_auto_picks_weak_topic(student_client, fake_learning_db: FakeLearningDB, seeded_course: str) -> None:
    fake_learning_db.topic_mastery[("student-1", seeded_course, "Fractions")] = {
        "mastery_score": 20.0,
        "last_score": 20.0,
        "attempts": 2,
        "updated_at": datetime.now(timezone.utc),
    }

    response = student_client.post(
        "/api/v1/learning/quiz/generate",
        json={
            "course_id": seeded_course,
            "session_goal": "Study integrals",
            "question_count": 5,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["topic"] == "Fractions"
    assert payload["topic_source"] == "weak_topic"
    assert payload["difficulty"] == "easy"
    assert len(payload["questions"]) == 5


def test_submit_quiz_updates_mastery_with_weighted_formula(student_client, fake_learning_db: FakeLearningDB, seeded_course: str) -> None:
    # First quiz for baseline mastery.
    first_generate = student_client.post(
        "/api/v1/learning/quiz/generate",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "question_count": 5,
        },
    )
    assert first_generate.status_code == 200
    first_quiz_id = first_generate.json()["quiz_id"]

    first_questions = fake_learning_db.sessions[first_quiz_id]["questions_json"]
    first_answers = [question["correct_index"] for question in first_questions]

    first_submit = student_client.post(
        "/api/v1/learning/quiz/submit",
        json={"quiz_id": first_quiz_id, "answers": first_answers},
    )
    assert first_submit.status_code == 200
    assert first_submit.json()["score"] == 100.0

    # Second quiz same topic with all wrong answers should update mastery:
    # new_mastery = prev_mastery * 0.7 + score * 0.3
    second_generate = student_client.post(
        "/api/v1/learning/quiz/generate",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "question_count": 5,
        },
    )
    assert second_generate.status_code == 200
    second_quiz_id = second_generate.json()["quiz_id"]

    wrong_answers = [3, 3, 3, 3, 3]
    second_submit = student_client.post(
        "/api/v1/learning/quiz/submit",
        json={"quiz_id": second_quiz_id, "answers": wrong_answers},
    )
    assert second_submit.status_code == 200

    second_payload = second_submit.json()
    assert second_payload["topic"] == "Linear equations"
    # When first score is 100 and second score trends to low, mastery should drop but remain smoothed.
    assert second_payload["mastery_score"] <= 100.0
    assert second_payload["mastery_score"] >= 0.0

    mastery_row = fake_learning_db.topic_mastery[("student-1", seeded_course, "Linear equations")]
    expected_mastery = round((100.0 * 0.7) + (second_payload["score"] * 0.3), 2)
    assert mastery_row["mastery_score"] == expected_mastery


def test_teacher_endpoint_returns_forbidden_for_student_role(student_client, seeded_course: str) -> None:
    response = student_client.get(f"/api/v1/learning/teacher/at-risk?course_id={seeded_course}")
    assert response.status_code == 403


def test_teacher_stats_returns_real_course_counts(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    seeded_course: str,
) -> None:
    fake_learning_db.enrollments.extend(
        [
            {"student_id": "student-1", "course_id": seeded_course},
            {"student_id": "student-2", "course_id": seeded_course},
        ]
    )

    response = teacher_client.get("/api/v1/learning/teacher/stats")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_courses"] >= 1
    assert payload["total_students"] >= 2
    assert any(c["course_id"] == seeded_course and c["student_count"] == 2 for c in payload["courses"])


def test_teacher_copilot_rejects_non_owned_course(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    monkeypatch,
) -> None:
    from app.presentation.api.v1 import learning as learning_module

    # Teacher-1 does not own this course.
    fake_learning_db.course_names["course-foreign"] = "Other Teacher Course"
    fake_learning_db.course_subjects["course-foreign"] = "Physics"
    fake_learning_db.course_owners["course-foreign"] = "teacher-2"

    monkeypatch.setattr(learning_module, "_copilot_gemini_key", lambda: "fake-key")
    monkeypatch.setattr(learning_module, "_copilot_call_gemini", lambda *_args, **_kwargs: "## Draft")

    response = teacher_client.post(
        "/api/v1/learning/teacher/generate-lesson-outline",
        json={
            "course_id": "course-foreign",
            "chapter_title": "Waves",
            "audience_level": "intermediate",
        },
    )
    assert response.status_code == 403
    assert "do not own" in response.json()["detail"].lower()


def test_generate_quiz_content_rejects_non_owned_course(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    monkeypatch,
) -> None:
    from app.presentation.api.v1 import learning as learning_module

    fake_learning_db.course_names["course-foreign"] = "Other Teacher Course"
    fake_learning_db.course_subjects["course-foreign"] = "Physics"
    fake_learning_db.course_owners["course-foreign"] = "teacher-2"

    monkeypatch.setattr(learning_module, "_copilot_gemini_key", lambda: "fake-key")
    monkeypatch.setattr(learning_module, "_copilot_call_gemini", lambda *_args, **_kwargs: "## Quiz Draft")

    response = teacher_client.post(
        "/api/v1/learning/teacher/generate-quiz-content",
        json={
            "course_id": "course-foreign",
            "topic": "Waves",
            "question_count": 5,
            "difficulty": "medium",
        },
    )
    assert response.status_code == 403
    assert "do not own" in response.json()["detail"].lower()


def test_generate_quiz_content_allows_owned_course(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    seeded_course: str,
    monkeypatch,
) -> None:
    from app.presentation.api.v1 import learning as learning_module

    fake_learning_db.document_chunks[seeded_course] = ["Chunk A", "Chunk B"]

    monkeypatch.setattr(learning_module, "_copilot_gemini_key", lambda: "fake-key")
    monkeypatch.setattr(learning_module, "_copilot_call_gemini", lambda *_args, **_kwargs: "## Quiz Draft")

    response = teacher_client.post(
        "/api/v1/learning/teacher/generate-quiz-content",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "question_count": 5,
            "difficulty": "medium",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["quiz_content"].startswith("## Quiz Draft")
    assert payload["grounded_by_docs"] is True
    assert payload["context_chunk_count"] == 2


def test_adaptive_quiz_prefers_teacher_quiz_bank_when_available(
    student_client,
    fake_learning_db: FakeLearningDB,
    seeded_course: str,
) -> None:
    fake_learning_db.teacher_quiz_banks.append(
        {
            "id": "bank-1",
            "teacher_id": "teacher-1",
            "course_id": seeded_course,
            "topic": "Linear equations",
            "difficulty": "medium",
            "questions_json": [
                {
                    "id": "tq1",
                    "question": "What does x represent in this equation?",
                    "options": [
                        "Unknown variable",
                        "A fixed constant",
                        "A unit label",
                        "A graph title",
                    ],
                    "correct_index": 0,
                },
                {
                    "id": "tq2",
                    "question": "What is the first valid step to solve 2x + 4 = 10?",
                    "options": [
                        "Divide both sides by 2 immediately",
                        "Subtract 4 from both sides",
                        "Add 4 to both sides",
                        "Move 10 to the left without operation",
                    ],
                    "correct_index": 1,
                },
            ],
            "created_at": datetime.now(timezone.utc),
        }
    )

    adaptive_response = student_client.post(
        "/api/v1/learning/quiz/generate",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "question_count": 3,
        },
    )
    assert adaptive_response.status_code == 200
    adaptive_payload = adaptive_response.json()
    assert adaptive_payload["question_source"] in {"teacher_bank", "hybrid"}
    assert any("unknown variable" in " ".join(q["options"]).lower() for q in adaptive_payload["questions"])


def test_generate_announcement_rejects_non_owned_course(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    monkeypatch,
) -> None:
    from app.presentation.api.v1 import learning as learning_module

    fake_learning_db.course_names["course-foreign"] = "Other Teacher Course"
    fake_learning_db.course_subjects["course-foreign"] = "Physics"
    fake_learning_db.course_owners["course-foreign"] = "teacher-2"

    monkeypatch.setattr(learning_module, "_copilot_gemini_key", lambda: "fake-key")
    monkeypatch.setattr(learning_module, "_copilot_call_gemini", lambda *_args, **_kwargs: "## Announcement Draft")

    response = teacher_client.post(
        "/api/v1/learning/teacher/generate-announcement",
        json={
            "course_id": "course-foreign",
            "subject": "Update",
            "tone": "friendly",
        },
    )
    assert response.status_code == 403
    assert "do not own" in response.json()["detail"].lower()


def test_generate_announcement_allows_owned_course(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    seeded_course: str,
    monkeypatch,
) -> None:
    from app.presentation.api.v1 import learning as learning_module

    fake_learning_db.document_chunks[seeded_course] = ["Exam is next Monday"]

    monkeypatch.setattr(learning_module, "_copilot_gemini_key", lambda: "fake-key")
    monkeypatch.setattr(learning_module, "_copilot_call_gemini", lambda *_args, **_kwargs: "## Announcement Draft")

    response = teacher_client.post(
        "/api/v1/learning/teacher/generate-announcement",
        json={
            "course_id": seeded_course,
            "subject": "Exam reminder",
            "tone": "friendly",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["announcement"].startswith("## Announcement Draft")
    assert payload["grounded_by_docs"] is True
    assert payload["context_chunk_count"] == 1


def test_publish_quiz_bank_success(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    seeded_course: str,
) -> None:
    response = teacher_client.post(
        "/api/v1/learning/teacher/quiz-bank/publish",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "difficulty": "medium",
            "quiz_content": """## Quiz: Linear equations (Medium)

**Q1.** What does x represent?
- A) Unknown variable
- B) Constant
- C) Unit
- D) Title

**Q2.** What should you do first in 2x + 4 = 10?
- A) Divide by 2
- B) Subtract 4 from both sides
- C) Add 4 to both sides
- D) Move 10 only

---

## ✅ Answer Key

| Q | Answer | Brief Explanation |
|---|--------|-------------------|
| Q1 | A | x is the unknown. |
| Q2 | B | Remove constant term first. |
""",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["saved_question_count"] == 2
    assert payload["topic"] == "Linear equations"
    assert len(fake_learning_db.teacher_quiz_banks) >= 1


def test_publish_quiz_bank_rejects_unparseable_markdown(
    teacher_client,
    seeded_course: str,
) -> None:
    response = teacher_client.post(
        "/api/v1/learning/teacher/quiz-bank/publish",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "difficulty": "medium",
            "quiz_content": "This is not a valid quiz format.",
        },
    )

    assert response.status_code == 400
    assert "parse" in response.json()["detail"].lower()


def test_publish_quiz_bank_rejects_non_owned_course(
    teacher_client,
    fake_learning_db: FakeLearningDB,
) -> None:
    fake_learning_db.course_names["course-foreign"] = "Other Teacher Course"
    fake_learning_db.course_subjects["course-foreign"] = "Physics"
    fake_learning_db.course_owners["course-foreign"] = "teacher-2"

    response = teacher_client.post(
        "/api/v1/learning/teacher/quiz-bank/publish",
        json={
            "course_id": "course-foreign",
            "topic": "Waves",
            "difficulty": "medium",
            "quiz_content": """## Quiz: Waves (Medium)

**Q1.** What is a wave?
- A) Energy transfer
- B) Nothing
- C) A color
- D) A number

---

## ✅ Answer Key

| Q | Answer | Brief Explanation |
|---|--------|-------------------|
| Q1 | A | Correct. |
""",
        },
    )

    assert response.status_code == 403
    assert "do not own" in response.json()["detail"].lower()


def test_list_update_delete_quiz_bank_flow(
    teacher_client,
    fake_learning_db: FakeLearningDB,
    seeded_course: str,
) -> None:
    publish_response = teacher_client.post(
        "/api/v1/learning/teacher/quiz-bank/publish",
        json={
            "course_id": seeded_course,
            "topic": "Linear equations",
            "difficulty": "medium",
            "quiz_content": """## Quiz: Linear equations (Medium)

**Q1.** What does x represent?
- A) Unknown variable
- B) Constant
- C) Unit
- D) Title

---

## ✅ Answer Key

| Q | Answer | Brief Explanation |
|---|--------|-------------------|
| Q1 | A | x is the unknown. |
""",
        },
    )
    assert publish_response.status_code == 200

    list_response = teacher_client.get(f"/api/v1/learning/teacher/quiz-bank?course_id={seeded_course}")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len(items) >= 1
    bank_id = items[0]["id"]
    assert items[0]["topic"] == "Linear equations"

    update_response = teacher_client.put(
        f"/api/v1/learning/teacher/quiz-bank/{bank_id}",
        json={
            "topic": "Linear equations advanced",
            "difficulty": "hard",
            "quiz_content": """## Quiz: Linear equations advanced (Hard)

**Q1.** Which expression isolates x in x + 2 = 5?
- A) x = 7
- B) x = 3
- C) x = 2
- D) x = 5

---

## ✅ Answer Key

| Q | Answer | Brief Explanation |
|---|--------|-------------------|
| Q1 | B | Subtract 2 from both sides. |
""",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["topic"] == "Linear equations advanced"
    assert updated["difficulty"] == "hard"
    assert updated["question_count"] == 1

    delete_response = teacher_client.delete(f"/api/v1/learning/teacher/quiz-bank/{bank_id}")
    assert delete_response.status_code == 200

    list_after_delete = teacher_client.get(f"/api/v1/learning/teacher/quiz-bank?course_id={seeded_course}")
    assert list_after_delete.status_code == 200
    assert list_after_delete.json()["items"] == []


