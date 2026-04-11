from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User

from app.models.progress import Progress

from app.models.chapter import Chapter
from sqlalchemy.orm import Session
from app.db.databases import get_db

from app.schemas.progress import ProgressCreate


router = APIRouter(prefix="/progress", tags=["Progress"])

@router.post("/")
def create_progress(progress : ProgressCreate, db : Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == progress.chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    user = db.query(User).filter(User.id == progress.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")    
    
    # Check if record already exists
    existing_progress = db.query(Progress).filter(
        Progress.user_id == progress.user_id,
        Progress.chapter_id == progress.chapter_id
    ).first()

    if existing_progress:
        existing_progress.status = progress.status
        db.commit()
        db.refresh(existing_progress)
        return existing_progress

    new_progress = Progress(
        user_id = progress.user_id,
        chapter_id = progress.chapter_id,
        status = progress.status,
    )
    
    db.add(new_progress)
    db.commit() 
    db.refresh(new_progress)
    return new_progress

@router.get("/{user_id}")
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    return db.query(Progress).filter(Progress.user_id == user_id).all()

@router.delete("/{user_id}/{chapter_id}")
def delete_progress(user_id: int, chapter_id: int, db: Session = Depends(get_db)):
    # Use .delete() directly on the query to remove all matching records
    deleted_count = db.query(Progress).filter(
        Progress.user_id == user_id, 
        Progress.chapter_id == chapter_id
    ).delete()
    
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Progress record not found")
    
    db.commit()
    return {"message": f"Successfully removed {deleted_count} progress records"}
