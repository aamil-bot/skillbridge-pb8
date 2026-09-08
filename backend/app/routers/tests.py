"""Skill assessment: serve questions, grade a submission, update skill scores."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.serializers import question_out, skill_score_out
from app.services import adaptive
from app.services.scoring import compute_final_score

router = APIRouter(prefix="/tests", tags=["assessment"])


@router.get("/questions", response_model=list[schemas.QuestionOut])
def get_questions(
    studentId: str = Query(..., description="Student the paper is for"),
    db: Session = Depends(get_db),
) -> list[schemas.QuestionOut]:
    student = db.get(models.Student, studentId)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {studentId} not found")

    questions = db.query(models.Question).order_by(models.Question.id).all()
    return [question_out(question) for question in questions]


@router.post("/submit", response_model=schemas.TestResultOut)
def submit_test(
    payload: schemas.TestSubmitIn, db: Session = Depends(get_db)
) -> schemas.TestResultOut:
    student = db.get(models.Student, payload.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {payload.student_id} not found")

    questions = {q.id: q for q in db.query(models.Question).all()}
    submitted = {answer.question_id: answer.selected_option for answer in payload.answers}

    unknown = sorted(set(submitted) - set(questions))
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown question ids: {unknown}")

    attempt = models.TestAttempt(id=f"ATT{uuid.uuid4().hex[:10].upper()}", student_id=student.id)
    db.add(attempt)

    per_skill: dict[str, dict[str, int]] = {}
    correct_count = 0

    for question in questions.values():
        selected = submitted.get(question.id, "")
        is_correct = selected == question.correct_option

        db.add(
            models.TestAnswer(
                attempt=attempt,
                question_id=question.id,
                selected_option=selected,
                is_correct=is_correct,
            )
        )

        bucket = per_skill.setdefault(question.skill_id, {"correct": 0, "total": 0})
        bucket["total"] += 1
        if is_correct:
            bucket["correct"] += 1
            correct_count += 1

    total_questions = len(questions)
    attempt.total_score = round(correct_count / total_questions * 100, 2) if total_questions else 0.0

    existing = {link.skill_id: link for link in student.skills}
    results: list[schemas.SkillResultOut] = []

    for skill_id, bucket in per_skill.items():
        test_score = round(bucket["correct"] / bucket["total"] * 100, 2)
        link = existing.get(skill_id)

        if link is None:
            link = models.StudentSkill(student_id=student.id, skill_id=skill_id)
            db.add(link)
            db.flush()
            existing[skill_id] = link

        previous_final = link.final_score
        link.test_score = test_score
        link.final_score = compute_final_score(
            subject_score=link.subject_score,
            test_score=link.test_score,
            project_score=link.project_score,
        )

        results.append(
            schemas.SkillResultOut(
                skill=link.skill.name if link.skill else skill_id,
                correct=bucket["correct"],
                total=bucket["total"],
                test_score=test_score,
                previous_final_score=round(previous_final, 1),
                final_score=round(link.final_score, 1),
                delta=round(link.final_score - previous_final, 1),
            )
        )

    db.commit()
    db.refresh(student)

    results.sort(key=lambda row: -row.final_score)

    return schemas.TestResultOut(
        attempt_id=attempt.id,
        student_id=student.id,
        total_score=attempt.total_score,
        correct_count=correct_count,
        total_questions=total_questions,
        completed_at=attempt.completed_at,
        skill_results=results,
        skill_profile=[
            skill_score_out(link)
            for link in sorted(student.skills, key=lambda link: -link.final_score)
        ],
    )


# --------------------------------------------------------------------------- #
# Adaptive assessment                                                          #
# --------------------------------------------------------------------------- #


def _responses_by_skill(
    db: Session, attempt: models.TestAttempt
) -> tuple[dict[str, list[adaptive.Response]], set[str]]:
    """Replay this attempt's answers into the shape the IRT engine wants."""
    by_skill: dict[str, list[adaptive.Response]] = {}
    asked: set[str] = set()

    for answer in attempt.answers:
        question = answer.question
        asked.add(question.id)
        by_skill.setdefault(question.skill.name, []).append(
            adaptive.Response(
                difficulty_b=adaptive.difficulty_b(question.difficulty),
                correct=answer.is_correct,
            )
        )
    return by_skill, asked


def _abilities(
    by_skill: dict[str, list[adaptive.Response]], all_skills: list[str]
) -> dict[str, adaptive.Ability]:
    return {
        name: (
            adaptive.estimate_ability(by_skill[name])
            if by_skill.get(name)
            else adaptive.blank_ability()
        )
        for name in all_skills
    }


def _state(
    db: Session, attempt: models.TestAttempt, finished_result=None
) -> schemas.AdaptiveStateOut:
    questions = db.query(models.Question).all()
    all_skills = sorted({q.skill.name for q in questions})

    by_skill, asked = _responses_by_skill(db, attempt)
    abilities = _abilities(by_skill, all_skills)

    remaining: dict[str, list[tuple[str, float]]] = {}
    for question in questions:
        if question.id in asked:
            continue
        remaining.setdefault(question.skill.name, []).append(
            (question.id, adaptive.difficulty_b(question.difficulty))
        )

    next_question = None
    if attempt.status == "in_progress":
        skill = adaptive.choose_next_skill(abilities, remaining)
        if skill is not None:
            question_id = adaptive.select_next_item(
                abilities[skill].theta, remaining[skill]
            )
            if question_id:
                next_question = question_out(db.get(models.Question, question_id))

    return schemas.AdaptiveStateOut(
        attempt_id=attempt.id,
        student_id=attempt.student_id,
        status=attempt.status,
        asked=len(asked),
        total_pool=len(questions),
        question=next_question,
        abilities=[
            schemas.AbilityOut(
                skill=name,
                theta=ability.theta,
                standard_error=ability.standard_error,
                score=ability.score,
                confidence=ability.confidence,
                items_seen=ability.items_seen,
                settled=adaptive.is_skill_settled(ability),
            )
            for name, ability in sorted(abilities.items())
        ],
        finished=attempt.status == "completed",
        result=finished_result,
        saved_questions=max(0, len(questions) - len(asked)),
    )


@router.post("/adaptive/start", response_model=schemas.AdaptiveStateOut)
def start_adaptive(
    payload: schemas.AdaptiveStartIn, db: Session = Depends(get_db)
) -> schemas.AdaptiveStateOut:
    """Open an adaptive session and hand back the first question."""
    student = db.get(models.Student, payload.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {payload.student_id} not found")

    # Abandon any half-finished session so a student cannot hold two open.
    for stale in (
        db.query(models.TestAttempt)
        .filter(
            models.TestAttempt.student_id == student.id,
            models.TestAttempt.status == "in_progress",
        )
        .all()
    ):
        stale.status = "abandoned"

    attempt = models.TestAttempt(
        id=f"ADP{uuid.uuid4().hex[:10].upper()}",
        student_id=student.id,
        mode="adaptive",
        status="in_progress",
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return _state(db, attempt)


@router.post("/adaptive/answer", response_model=schemas.AdaptiveStateOut)
def answer_adaptive(
    payload: schemas.AdaptiveAnswerIn, db: Session = Depends(get_db)
) -> schemas.AdaptiveStateOut:
    """
    Grade one answer, re-estimate ability, and either serve the next question or
    finish and write the scores through to the student's skill profile.
    """
    attempt = db.get(models.TestAttempt, payload.attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail=f"Attempt {payload.attempt_id} not found")
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="This assessment is already finished")

    question = db.get(models.Question, payload.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail=f"Question {payload.question_id} not found")
    if any(answer.question_id == question.id for answer in attempt.answers):
        raise HTTPException(status_code=409, detail="That question was already answered")

    db.add(
        models.TestAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            selected_option=payload.selected_option,
            is_correct=payload.selected_option == question.correct_option,
        )
    )
    db.commit()
    db.refresh(attempt)

    state = _state(db, attempt)
    if state.question is not None:
        return state

    # Nothing left worth asking — settle up.
    return _finish_adaptive(db, attempt)


def _finish_adaptive(
    db: Session, attempt: models.TestAttempt
) -> schemas.AdaptiveStateOut:
    student = db.get(models.Student, attempt.student_id)
    questions = db.query(models.Question).all()
    all_skills = sorted({q.skill.name for q in questions})
    skill_by_name = {skill.name: skill for skill in db.query(models.Skill).all()}

    by_skill, _asked = _responses_by_skill(db, attempt)
    abilities = _abilities(by_skill, all_skills)

    existing = {link.skill_id: link for link in student.skills}
    results: list[schemas.SkillResultOut] = []

    for name, ability in abilities.items():
        if ability.items_seen == 0:
            continue  # never asked about, so leave the existing score alone

        skill = skill_by_name[name]
        link = existing.get(skill.id)
        if link is None:
            link = models.StudentSkill(student_id=student.id, skill_id=skill.id)
            db.add(link)
            db.flush()
            existing[skill.id] = link

        previous_final = link.final_score
        link.test_score = float(ability.score)
        link.final_score = compute_final_score(
            subject_score=link.subject_score,
            test_score=link.test_score,
            project_score=link.project_score,
        )

        correct = sum(1 for response in by_skill[name] if response.correct)
        results.append(
            schemas.SkillResultOut(
                skill=name,
                correct=correct,
                total=ability.items_seen,
                test_score=float(ability.score),
                previous_final_score=round(previous_final, 1),
                final_score=round(link.final_score, 1),
                delta=round(link.final_score - previous_final, 1),
            )
        )

    correct_total = sum(row.correct for row in results)
    asked_total = sum(row.total for row in results)

    attempt.total_score = round(correct_total / asked_total * 100, 2) if asked_total else 0.0
    attempt.status = "completed"
    db.commit()
    db.refresh(attempt)
    db.refresh(student)

    results.sort(key=lambda row: -row.final_score)

    result = schemas.TestResultOut(
        attempt_id=attempt.id,
        student_id=student.id,
        total_score=attempt.total_score,
        correct_count=correct_total,
        total_questions=asked_total,
        completed_at=attempt.completed_at,
        skill_results=results,
        skill_profile=[
            skill_score_out(link)
            for link in sorted(student.skills, key=lambda link: -link.final_score)
        ],
    )
    return _state(db, attempt, finished_result=result)
