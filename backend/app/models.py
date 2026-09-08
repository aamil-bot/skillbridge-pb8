"""SQLAlchemy models for SkillBridge.

Identifiers are short readable strings (STU001, job_frontend_01) because the API
contract addresses records by them directly.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(str, enum.Enum):
    STUDENT = "student"
    COMPANY = "company"
    TPO = "tpo"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW = "INTERVIEW"
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    # Demo-only credential. Real auth (hashing, tokens) is out of MVP scope.
    demo_password: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)

    student: Mapped[Student | None] = relationship(back_populates="user", uselist=False)
    company: Mapped[Company | None] = relationship(back_populates="user", uselist=False)


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    registration_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    college: Mapped[str] = mapped_column(String(160), nullable=False)
    department: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    cgpa: Mapped[float] = mapped_column(Float, nullable=False)
    preferred_city: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    expected_stipend: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user: Mapped[User] = relationship(back_populates="student")
    skills: Mapped[list[StudentSkill]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    projects: Mapped[list[Project]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    attempts: Mapped[list[TestAttempt]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    applications: Mapped[list[Application]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    user: Mapped[User] = relationship(back_populates="company")
    jobs: Mapped[list[Job]] = relationship(back_populates="company", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)


class SubjectSkillMap(Base):
    """Which academic subjects feed which skill, and by how much."""

    __tablename__ = "subject_skill_map"
    __table_args__ = (UniqueConstraint("department", "subject_name", "skill_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    subject_name: Mapped[str] = mapped_column(String(120), nullable=False)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    contribution_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    skill: Mapped[Skill] = relationship()


class StudentSkill(Base, TimestampMixin):
    __tablename__ = "student_skills"
    __table_args__ = (UniqueConstraint("student_id", "skill_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), index=True)
    subject_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    test_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    project_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    final_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    student: Mapped[Student] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    skills_text: Mapped[str] = mapped_column(String(240), nullable=False, default="")

    student: Mapped[Student] = relationship(back_populates="projects")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    # [{"id": "a", "text": "..."}, ...]
    options_json: Mapped[str] = mapped_column(Text, nullable=False)
    correct_option: Mapped[str] = mapped_column(String(4), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")

    skill: Mapped[Skill] = relationship()


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    total_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # "fixed" = every question served at once; "adaptive" = IRT item selection.
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="fixed")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="completed", index=True)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student: Mapped[Student] = relationship(back_populates="attempts")
    answers: Mapped[list[TestAnswer]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class TestAnswer(Base):
    __tablename__ = "test_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("test_attempts.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    selected_option: Mapped[str] = mapped_column(String(4), nullable=False, default="")
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    attempt: Mapped[TestAttempt] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(140), nullable=False)
    location: Mapped[str] = mapped_column(String(80), nullable=False)
    stipend: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_cgpa: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    openings: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped[Company] = relationship(back_populates="jobs")
    required_skills: Mapped[list[JobSkill]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    applications: Mapped[list[Application]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    required_score: Mapped[float] = mapped_column(Float, nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    job: Mapped[Job] = relationship(back_populates="required_skills")
    skill: Mapped[Skill] = relationship()


class Application(Base, TimestampMixin):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("student_id", "job_id"),)

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ApplicationStatus.APPLIED.value, index=True
    )
    match_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    student: Mapped[Student] = relationship(back_populates="applications")
    job: Mapped[Job] = relationship(back_populates="applications")
