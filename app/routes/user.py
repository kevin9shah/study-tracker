import hashlib
from fastapi import  Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.schemas.user import UserCreate, UserOut, UserLogin
import hashlib
router = APIRouter(prefix="/users", tags=["Users"])



@router.post("/", response_model = UserOut)
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

@router.post("/login")
def login_user(user : UserLogin, db : Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if not existing_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    hashed_password = hashlib.sha256(user.password.encode()).hexdigest()

    if hashed_password != existing_user.password_hash:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    from app.models.couple import Couple
    couple = db.query(Couple).filter((Couple.uid1 == existing_user.id) | (Couple.uid2 == existing_user.id)).first()
    partner_id = None
    partner_name = None
    if couple:
        if couple.uid1 == existing_user.id and couple.uid2 is not None:
            partner_id = couple.uid2
        elif couple.uid2 == existing_user.id:
            partner_id = couple.uid1
        
        if partner_id:
            partner = db.query(User).filter(User.id == partner_id).first()
            if partner:
                partner_name = partner.name

    return {"message" : "Successfully logged in",
            "user" : {
                "id" : existing_user.id,
                "name" : existing_user.name,
                "email" : existing_user.email,
            },
            "partner_id": partner_id,
            "partner_name": partner_name
            }
    
    
    