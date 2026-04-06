from fastapi import FastAPI, Depends
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

    user = User()
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
