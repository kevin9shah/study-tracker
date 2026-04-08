from fastapi import  Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.schemas.user import UserCreate, UserOut
import hashlib
router = APIRouter(prefix="/subject", tags=["Subject"])



@router.post("/users/", response_model = UserOut)
def create_user(user : UserCreate, db : Session = Depends(get_db)):
    hashed_password = hashlib.sha256(user.password.encode()).hexdigest()
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        name = user.name,
        email = user.email,
        password_hash = hashed_password
    )

    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

