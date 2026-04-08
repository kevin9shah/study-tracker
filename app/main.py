from fastapi import FastAPI, Depends, HTTPException
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
import random 

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Backend running 🚀"}

@app.get("/health")
def health():
    return {"status": "OK"}

@app.get("/db-test")
def db_test():
    return {"db": str(engine)}
# add in database.py
from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

@app.post("/users/")
def create_user(user : UserCreate, db : Session = Depends(get_db)):
    new_user = User(
        name = user.name,
        email = user.email,
        password_hash = user.password 
    )

    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


class SubjectCreate(BaseModel):
    name : int
    user_id : int 

@app.post("/subjects/")
def create_subject(subject : SubjectCreate, db : Session = Depends(get_db)):
    new_subject = Subject(
        name = subject.name,
        user_id = subject.user_id
    )
    
    db.add(new_subject)
    db.commit() 
    db.refresh(new_subject)
    return new_subject

class ChapterCreate(BaseModel):
    subject_id : int
    chapter_number : int
    created_at : datetime
    updated_at : datetime
    subject : str

@app.post("/chapters/")
def create_chapter(chapter : ChapterCreate, db : Session = Depends(get_db)):
    new_chapter = Chapter(
        subject_id = chapter.subject_id,
        chapter_number = chapter.chapter_number,
        created_at = chapter.created_at,
        updated_at = chapter.updated_at,
        subject = chapter.subject
    )
    
    db.add(new_chapter)
    db.commit() 
    db.refresh(new_chapter)
    return new_chapter

class PunishmentCreate(BaseModel):
    user_id : int 
    title : str
    status : str

@app.post("/punishments/")
def create_punishment(punishment : PunishmentCreate, db : Session = Depends(get_db)):
    new_punishment = Punishment(
        user_id = punishment.user_id,
        title = punishment.title,
        status = punishment.status
    )
    
    db.add(new_punishment)
    db.commit() 
    db.refresh(new_punishment)
    return new_punishment

class ProgressCreate(BaseModel):
    user_id : int
    chapter_id : int
    status : str
    updated_at : datetime

@app.post("/progress/")
def create_progress(progress : ProgressCreate, db : Session = Depends(get_db)):
    new_progress = Progress(
        user_id = progress.user_id,
        chapter_id = progress.chapter_id,
        status = progress.status,
        updated_at = progress.updated_at
    )
    
    db.add(new_progress)
    db.commit() 
    db.refresh(new_progress)
    return new_progress

class DeadlineCreate(BaseModel):
    user_id : int
    chapter_id : int
    deadline_time : datetime
    status : str
    created_at : datetime

@app.post("/deadlines/")
def create_deadline(deadline : DeadlineCreate, db : Session = Depends(get_db)):
    new_deadline = Deadline(
        user_id = deadline.user_id,
        chapter_id = deadline.chapter_id,
        deadline_time = deadline.deadline_time,
        status = deadline.status,
        created_at = deadline.created_at
    )
    
    db.add(new_deadline)
    db.commit() 
    db.refresh(new_deadline)
    return new_deadline

class CoupleCreate(BaseModel):
    uid1 : int

class CoupleJoin(BaseModel):
    uid2 : int
    unique_code : str

def generate_unique_code(db : Session) -> str:
    while True:
        code = str(random.randint(100000,999999))
        exists = db.query(Couple).filter(Couple.unique_code == code).first()
        if not exists:
            return code

@app.post("/couples/")
def create_couple(couple : CoupleCreate, db : Session = Depends(get_db)):
    unique_code = generate_unique_code(db)
    new_couple = Couple(
        uid1 = couple.uid1,
        unique_code = unique_code
    )
    db.add(new_couple)
    db.commit()
    db.refresh(new_couple)
    return new_couple

@app.post("/couples/join")
def join_couple(data : CoupleJoin, db : Session = Depends(get_db)):
    couple = db.query(Couple).filter(Couple.unique_code == data.unique_code).first()

    if not couple:
        raise HTTPException(status_code=404, detail="Couple not found")
    if couple.status == "active":
        raise HTTPException(status_code=400, detail="Couple already linked")
    if couple.uid1 == data.uid2:
        raise HTTPException(status_code=400, detail="Cannot link with yourself")
    
    couple.uid2 = data.uid2
    couple.status = "active"
    db.commit()
    db.refresh(couple)
    return {"message" : "Successfully joined couple", "couple" : couple}