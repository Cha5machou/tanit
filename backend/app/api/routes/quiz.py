from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_admin_user, get_current_user
from app.services.firestore import FirestoreService
from app.schemas.quiz import (
    QuizQuestionCreate,
    QuizQuestionUpdate,
    QuizQuestionResponse,
    QuizQuestionForUser,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
)
from typing import Dict, Any, List, Optional
from datetime import datetime
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/quiz/questions", response_model=QuizQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz_question(
    question: QuizQuestionCreate,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Create a new quiz question (Admin only)"""
    try:
        # Validate correct_answer_index
        if question.correct_answer_index >= len(question.options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="correct_answer_index must be within the range of options"
            )
        
        question_data = {
            "question": question.question,
            "options": question.options,
            "correct_answer_index": question.correct_answer_index,
            "tags": question.tags if question.tags else [],
            "is_active": question.is_active,
        }
        
        question_id = FirestoreService.create_quiz_question(question_data)
        created_question = FirestoreService.get_quiz_question(question_id)
        
        if not created_question:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created question"
            )
        
        # Convert Firestore timestamps to datetime
        created_at = created_question.get("created_at")
        updated_at = created_question.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return QuizQuestionResponse(
            question_id=created_question["question_id"],
            question=created_question["question"],
            options=created_question["options"],
            correct_answer_index=created_question["correct_answer_index"],
            tags=created_question.get("tags", []),
            is_active=created_question.get("is_active", True),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating quiz question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating quiz question: {str(e)}"
        )


@router.get("/quiz/questions", response_model=List[QuizQuestionResponse])
async def list_quiz_questions(
    active_only: bool = False,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """List all quiz questions (Admin only)"""
    try:
        questions = FirestoreService.list_quiz_questions(active_only=active_only)
        
        result = []
        for q in questions:
            created_at = q.get("created_at")
            updated_at = q.get("updated_at")
            
            if hasattr(created_at, 'timestamp'):
                created_at = datetime.fromtimestamp(created_at.timestamp())
            if hasattr(updated_at, 'timestamp'):
                updated_at = datetime.fromtimestamp(updated_at.timestamp())
            
            result.append(QuizQuestionResponse(
                question_id=q["question_id"],
                question=q["question"],
                options=q["options"],
                correct_answer_index=q["correct_answer_index"],
                tags=q.get("tags", []),
                is_active=q.get("is_active", True),
                created_at=created_at,
                updated_at=updated_at,
            ))
        
        return result
    except Exception as e:
        logger.error(f"Error listing quiz questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing quiz questions: {str(e)}"
        )


@router.get("/quiz/questions/active", response_model=List[QuizQuestionForUser])
async def get_active_quiz_questions(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get active quiz questions for users (without correct answers)"""
    try:
        questions = FirestoreService.list_quiz_questions(active_only=True)
        
        result = []
        for q in questions:
            created_at = q.get("created_at")
            updated_at = q.get("updated_at")
            
            created_at_str = None
            updated_at_str = None
            
            if created_at:
                if hasattr(created_at, 'timestamp'):
                    created_at_str = datetime.fromtimestamp(created_at.timestamp()).isoformat()
                elif isinstance(created_at, str):
                    try:
                        dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        created_at_str = dt.isoformat()
                    except:
                        created_at_str = None
                        
            if updated_at:
                if hasattr(updated_at, 'timestamp'):
                    updated_at_str = datetime.fromtimestamp(updated_at.timestamp()).isoformat()
                elif isinstance(updated_at, str):
                    try:
                        dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                        updated_at_str = dt.isoformat()
                    except:
                        updated_at_str = None
            
            # Don't expose correct_answer_index to users
            result.append(QuizQuestionForUser(
                question_id=q["question_id"],
                question=q["question"],
                options=q["options"],
                tags=q.get("tags", []),
                created_at=created_at_str,
                updated_at=updated_at_str,
            ))
        
        return result
    except Exception as e:
        import traceback
        logger.error(f"Error getting active quiz questions: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting active quiz questions: {str(e)}"
        )


@router.get("/quiz/questions/{question_id}", response_model=QuizQuestionResponse)
async def get_quiz_question(
    question_id: str,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Get a specific quiz question (Admin only)"""
    try:
        question = FirestoreService.get_quiz_question(question_id)
        
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        created_at = question.get("created_at")
        updated_at = question.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return QuizQuestionResponse(
            question_id=question["question_id"],
            question=question["question"],
            options=question["options"],
            correct_answer_index=question["correct_answer_index"],
            tags=question.get("tags", []),
            is_active=question.get("is_active", True),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quiz question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting quiz question: {str(e)}"
        )


@router.put("/quiz/questions/{question_id}", response_model=QuizQuestionResponse)
async def update_quiz_question(
    question_id: str,
    question: QuizQuestionUpdate,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Update a quiz question (Admin only)"""
    try:
        existing_question = FirestoreService.get_quiz_question(question_id)
        
        if not existing_question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        updates = {}
        
        if question.question is not None:
            updates["question"] = question.question
        if question.options is not None:
            # Validate correct_answer_index if options are updated
            if question.correct_answer_index is not None:
                if question.correct_answer_index >= len(question.options):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="correct_answer_index must be within the range of options"
                    )
                updates["correct_answer_index"] = question.correct_answer_index
            elif existing_question.get("correct_answer_index", 0) >= len(question.options):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current correct_answer_index is out of range for new options"
                )
            updates["options"] = question.options
        elif question.correct_answer_index is not None:
            if question.correct_answer_index >= len(existing_question["options"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="correct_answer_index must be within the range of options"
                )
            updates["correct_answer_index"] = question.correct_answer_index
        if question.tags is not None:
            updates["tags"] = question.tags
        if question.is_active is not None:
            updates["is_active"] = question.is_active
        
        if updates:
            FirestoreService.update_quiz_question(question_id, updates)
        
        updated_question = FirestoreService.get_quiz_question(question_id)
        
        created_at = updated_question.get("created_at")
        updated_at = updated_question.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return QuizQuestionResponse(
            question_id=updated_question["question_id"],
            question=updated_question["question"],
            options=updated_question["options"],
            correct_answer_index=updated_question["correct_answer_index"],
            tags=updated_question.get("tags", []),
            is_active=updated_question.get("is_active", True),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quiz question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating quiz question: {str(e)}"
        )


@router.delete("/quiz/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz_question(
    question_id: str,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Delete a quiz question (Admin only)"""
    try:
        success = FirestoreService.delete_quiz_question(question_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quiz question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting quiz question: {str(e)}"
        )


@router.get("/quiz/check-eligibility")
async def check_quiz_eligibility(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check if user can take the quiz today"""
    try:
        user_id = current_user["uid"]
        today_submission = FirestoreService.get_user_quiz_submission_today(user_id)
        
        return {
            "can_take_quiz": today_submission is None,
            "already_taken_today": today_submission is not None,
        }
    except Exception as e:
        logger.error(f"Error checking quiz eligibility: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking quiz eligibility: {str(e)}"
        )


@router.post("/quiz/submit", response_model=QuizSubmissionResponse)
async def submit_quiz(
    submission: QuizSubmissionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit quiz answers"""
    try:
        user_id = current_user["uid"]
        
        # Check if user already took quiz today
        today_submission = FirestoreService.get_user_quiz_submission_today(user_id)
        if today_submission:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already taken the quiz today. Please try again tomorrow."
            )
        
        # Get all active questions to validate answers
        questions = FirestoreService.list_quiz_questions(active_only=True)
        questions_dict = {q["question_id"]: q for q in questions}
        
        # Validate and score answers
        correct_answers = 0
        total_questions = len(submission.answers)
        answer_details = []
        
        for answer in submission.answers:
            question_id = answer.get("question_id")
            selected_index = answer.get("selected_index")
            time_taken = answer.get("time_taken", 0)
            
            if question_id not in questions_dict:
                continue
            
            question = questions_dict[question_id]
            is_correct = selected_index == question["correct_answer_index"]
            
            if is_correct:
                correct_answers += 1
            
            answer_details.append({
                "question_id": question_id,
                "question": question["question"],
                "selected_index": selected_index,
                "correct_index": question["correct_answer_index"],
                "is_correct": is_correct,
                "time_taken": time_taken,
            })
        
        score = int((correct_answers / total_questions) * 100) if total_questions > 0 else 0
        
        submission_data = {
            "user_id": user_id,
            "score": score,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "answers": answer_details,
        }
        
        submission_id = FirestoreService.create_quiz_submission(submission_data)
        created_submission = FirestoreService.get_quiz_submission(submission_id)
        
        if not created_submission:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created submission"
            )
        
        submitted_at = created_submission.get("submitted_at")
        if hasattr(submitted_at, 'timestamp'):
            submitted_at = datetime.fromtimestamp(submitted_at.timestamp())
        
        return QuizSubmissionResponse(
            submission_id=created_submission["submission_id"],
            user_id=created_submission["user_id"],
            score=created_submission["score"],
            total_questions=created_submission["total_questions"],
            correct_answers=created_submission["correct_answers"],
            submitted_at=submitted_at,
            answers=created_submission["answers"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting quiz: {str(e)}"
        )


@router.get("/quiz/submissions", response_model=List[QuizSubmissionResponse])
async def list_quiz_submissions(
    user_id: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """List quiz submissions (Admin only)"""
    try:
        submissions = FirestoreService.list_quiz_submissions(user_id=user_id)
        
        result = []
        for s in submissions:
            submitted_at = s.get("submitted_at")
            if hasattr(submitted_at, 'timestamp'):
                submitted_at = datetime.fromtimestamp(submitted_at.timestamp())
            
            result.append(QuizSubmissionResponse(
                submission_id=s["submission_id"],
                user_id=s["user_id"],
                score=s["score"],
                total_questions=s["total_questions"],
                correct_answers=s["correct_answers"],
                submitted_at=submitted_at,
                answers=s.get("answers", []),
            ))
        
        return result
    except Exception as e:
        logger.error(f"Error listing quiz submissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing quiz submissions: {str(e)}"
        )


@router.get("/quiz/statistics")
async def get_quiz_statistics(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Get quiz statistics for monitoring (Admin only)"""
    try:
        submissions = FirestoreService.list_quiz_submissions()
        
        if not submissions:
            return {
                "total_quizzes_taken": 0,
                "average_score": 0,
                "average_per_user": 0,
                "total_users": 0,
                "score_distribution": [],
                "quizzes_by_date": [],
            }
        
        # Total quizzes taken
        total_quizzes_taken = len(submissions)
        
        # Average score
        total_score = sum(s["score"] for s in submissions)
        average_score = round(total_score / total_quizzes_taken, 2)
        
        # Unique users
        unique_users = set(s["user_id"] for s in submissions)
        total_users = len(unique_users)
        
        # Average per user
        user_quiz_counts = {}
        for s in submissions:
            user_id = s["user_id"]
            user_quiz_counts[user_id] = user_quiz_counts.get(user_id, 0) + 1
        
        average_per_user = round(total_quizzes_taken / total_users, 2) if total_users > 0 else 0
        
        # Score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
        score_ranges = {
            "0-20": 0,
            "21-40": 0,
            "41-60": 0,
            "61-80": 0,
            "81-100": 0,
        }
        
        for s in submissions:
            score = s["score"]
            if score <= 20:
                score_ranges["0-20"] += 1
            elif score <= 40:
                score_ranges["21-40"] += 1
            elif score <= 60:
                score_ranges["41-60"] += 1
            elif score <= 80:
                score_ranges["61-80"] += 1
            else:
                score_ranges["81-100"] += 1
        
        score_distribution = [
            {"range": k, "count": v} for k, v in score_ranges.items()
        ]
        
        # Quizzes by date
        quizzes_by_date_dict = defaultdict(int)
        
        for s in submissions:
            submitted_at = s.get("submitted_at")
            if hasattr(submitted_at, 'timestamp'):
                submitted_at = datetime.fromtimestamp(submitted_at.timestamp())
            elif isinstance(submitted_at, str):
                try:
                    submitted_at = datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
                except:
                    continue
            elif not isinstance(submitted_at, datetime):
                continue
            
            date_key = submitted_at.strftime('%Y-%m-%d')
            quizzes_by_date_dict[date_key] += 1
        
        quizzes_by_date = [
            {"date": k, "count": v}
            for k, v in sorted(quizzes_by_date_dict.items())
        ]
        
        return {
            "total_quizzes_taken": total_quizzes_taken,
            "average_score": average_score,
            "average_per_user": average_per_user,
            "total_users": total_users,
            "score_distribution": score_distribution,
            "quizzes_by_date": quizzes_by_date,
        }
    except Exception as e:
        logger.error(f"Error getting quiz statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting quiz statistics: {str(e)}"
        )

