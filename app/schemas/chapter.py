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



class ChapterCreate(BaseModel):
    subject_id : int
    chapter_number : int
    subject : str
