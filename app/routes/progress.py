from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User

from app.models.progress import Progress

from app.models.chapter import Chapter
from sqlalchemy.orm import Session
from app.db.databases import get_db

from app.schemas.progress import ProgressCreate


router = APIRouter(prefix="/progress", tags=["Progress"])

@router.post("/progress/")
def create_progress(progress : ProgressCreate, db : Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == progress.chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    user = db.query(User).filter(User.id == progress.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")    
    new_progress = Progress(
        user_id = progress.user_id,
        chapter_id = progress.chapter_id,
        status = progress.status,
    )
    
    db.add(new_progress)
    db.commit() 
    db.refresh(new_progress)
    return new_progress
