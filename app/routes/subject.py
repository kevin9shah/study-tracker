from fastapi import FastAPI, Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User
from app.models.subject import Subject
from app.models.punishment import Punishment
from app.models.progress import Progress
from app.models.deadline import Deadline
from app.models.couple import Couple
from app.models.chapter import Chapter
from sqlalchemy.orm import Session
from app.db.databases import get_db
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
from app.schemas.subject import SubjectCreate

router = APIRouter(prefix="/subject", tags=["Subject"])

@router.post("/subjects/")
def create_subject(subject : SubjectCreate, db : Session = Depends(get_db)):
    user = db.query(User).filter(User.id == subject.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_subject = Subject(
        name = subject.name,
        user_id = subject.user_id
    )
    
    db.add(new_subject)
    db.commit() 
    db.refresh(new_subject)
    return new_subject


