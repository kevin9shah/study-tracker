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
from app.schemas.punishment import PunishmentCreate
from pydantic import BaseModel

router = APIRouter(prefix="/punishment", tags=["Punishment"])


@router.post("/punishments/")
def create_punishment(punishment : PunishmentCreate, db : Session = Depends(get_db)):
    user = db.query(User).filter(User.id == punishment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")    
    new_punishment = Punishment(
        user_id = punishment.user_id,
        title = punishment.title,
        status = punishment.status
    )
    
    db.add(new_punishment)
    db.commit() 
    db.refresh(new_punishment)
    return new_punishment
