from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QuizQuestionCreate(BaseModel):
    question: str = Field(..., description="La question")
    options: List[str] = Field(..., min_items=2, max_items=6, description="Liste des options de réponse (2-6)")
    correct_answer_index: int = Field(..., ge=0, description="Index de la bonne réponse (0-based)")
    tags: List[str] = Field(default=[], description="Tags pour identifier le sujet de la question")
    is_active: bool = Field(default=True, description="Question active ou non")


class QuizQuestionUpdate(BaseModel):
    question: Optional[str] = None
    options: Optional[List[str]] = Field(None, min_items=2, max_items=6)
    correct_answer_index: Optional[int] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class QuizQuestionResponse(BaseModel):
    question_id: str
    question: str
    options: List[str]
    correct_answer_index: int
    tags: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuizSubmissionRequest(BaseModel):
    answers: List[dict] = Field(..., description="Liste des réponses avec question_id et selected_index")
    # Format: [{"question_id": "xxx", "selected_index": 0, "time_taken": 45}]


class QuizQuestionForUser(BaseModel):
    question_id: str
    question: str
    options: List[str]
    tags: List[str]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class QuizSubmissionResponse(BaseModel):
    submission_id: str
    user_id: str
    score: int
    total_questions: int
    correct_answers: int
    submitted_at: datetime
    answers: List[dict]  # Détails des réponses

    class Config:
        from_attributes = True

