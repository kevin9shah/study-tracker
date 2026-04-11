from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User

from app.models.deadline import Deadline

from app.models.chapter import Chapter
from app.models.subject import Subject
from sqlalchemy.orm import Session
from app.db.databases import get_db

from app.schemas.deadline import DeadlineCreate


router = APIRouter(prefix="/deadline", tags=["Deadline"])


@router.post("/")
def create_deadline(deadline : DeadlineCreate, db : Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == deadline.chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    user = db.query(User).filter(User.id == deadline.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")    
    new_deadline = Deadline(
        user_id = deadline.user_id,
        chapter_id = deadline.chapter_id,
        deadline_time = deadline.deadline_time,
        status = deadline.status,
      
    )
    
    db.add(new_deadline)
    db.commit() 
    db.refresh(new_deadline)
    return new_deadline

@router.get("/{user_id}")
def get_user_deadlines(user_id: int, db: Session = Depends(get_db)):
    # Use outer joins in case some metadata is missing
    results = db.query(Deadline, Chapter, Subject).outerjoin(
        Chapter, Deadline.chapter_id == Chapter.id
    ).outerjoin(
        Subject, Chapter.subject_id == Subject.id
    ).filter(Deadline.user_id == user_id).all()
    
    tasks = []
    for deadline, chapter, subject in results:
        tasks.append({
            "id": deadline.id,
            "user_id": deadline.user_id,
            "chapter_id": deadline.chapter_id,
            "subject": subject.name if subject else "Unknown Subject",
            "chapter_number": chapter.chapter_number if chapter else 0,
            "chapter_name": chapter.name if (chapter and chapter.name) else (f"Chapter {chapter.chapter_number}" if chapter else "Unknown Chapter"),
            "deadline_time": deadline.deadline_time,
            "status": deadline.status
        })
    return tasks

@router.delete("/{deadline_id}")
def delete_deadline(deadline_id: int, db: Session = Depends(get_db)):
    deadline = db.query(Deadline).filter(Deadline.id == deadline_id).first()
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    
    db.delete(deadline)
    db.commit()
    return {"message": "Deadline deleted successfully"}
