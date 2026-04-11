from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User
from app.models.subject import Subject
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.schemas.subject import SubjectCreate, SubjectDelete

router = APIRouter(prefix="/subject", tags=["Subject"])

@router.post("/")
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



@router.delete("/")
def delete_subject(data: SubjectDelete, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}