from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User

from app.models.deadline import Deadline

from app.models.chapter import Chapter
from sqlalchemy.orm import Session
from app.db.databases import get_db

from app.schemas.deadline import DeadlineCreate


router = APIRouter(prefix="/deadline", tags=["Deadline"])


@router.post("/deadlines/")
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
