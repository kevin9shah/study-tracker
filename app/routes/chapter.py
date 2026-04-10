from fastapi import FastAPI, Depends, HTTPException, APIRouter
from app.models.subject import Subject
from app.models.chapter import Chapter
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.schemas.chapter import ChapterCreate


router = APIRouter(prefix="/chapter", tags=["Chapter"])


@router.post("/")
def create_chapter(chapter : ChapterCreate, db : Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == chapter.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    new_chapter = Chapter(
        subject_id = chapter.subject_id,
        chapter_number = chapter.chapter_number
    )
    
    db.add(new_chapter)
    db.commit() 
    db.refresh(new_chapter)
    return new_chapter
