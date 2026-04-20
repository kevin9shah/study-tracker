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

@router.post("/{user_id}/ping")
def ping_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        from datetime import datetime
        user.last_active = datetime.utcnow()
        db.commit()
    return {"status": "ok"}

@router.get("/{user_id}/activity")
def get_user_activity(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    
    from app.models.progress import Progress
    from sqlalchemy import func
    records = db.query(func.date(Progress.updated_at)).filter(
        Progress.user_id == user_id, 
        Progress.status == 'completed'
    ).distinct().order_by(func.date(Progress.updated_at).desc()).all()
    
    streak = 0
    from datetime import datetime, timedelta
    current_date = datetime.utcnow().date()
    
    dates = [r[0] for r in records]
    
    expected_date = current_date
    for d in dates:
        if d == expected_date:
            streak += 1
            expected_date -= timedelta(days=1)
        elif d == current_date - timedelta(days=1) and streak == 0:
            streak += 1
            expected_date = current_date - timedelta(days=2)
        else:
            break
            
    is_active = False
    if user.last_active:
        time_diff = datetime.utcnow() - user.last_active
        is_active = time_diff.total_seconds() <= 300 # 5 minutes
        
    return {
        "last_active": user.last_active,
        "is_active": is_active,
        "streak": streak
    }