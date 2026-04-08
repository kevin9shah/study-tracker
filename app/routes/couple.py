from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User
from app.models.couple import Couple
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.schemas.couple import CoupleCreate, CoupleJoin
import random

router = APIRouter(prefix="/couple", tags=["Couple"])

def generate_unique_code(db : Session) -> str:
    while True:
        code = str(random.randint(100000,999999))
        exists = db.query(Couple).filter(Couple.unique_code == code).first()
        if not exists:
            return code

@router.post("/couples/")
def create_couple(couple : CoupleCreate, db : Session = Depends(get_db)):
    user = db.query(User).filter(User.id == couple.uid1).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Couple).filter((Couple.uid1 == couple.uid1) | (Couple.uid2 == couple.uid1)).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already in a couple")
    unique_code = generate_unique_code(db)
    new_couple = Couple(
        uid1 = couple.uid1,
        unique_code = unique_code
    )
    db.add(new_couple)
    db.commit()
    db.refresh(new_couple)
    return new_couple

@router.post("/couples/join")
def join_couple(data : CoupleJoin, db : Session = Depends(get_db)):
    user2 = db.query(User).filter(User.id == data.uid2).first()
    if not user2:
        raise HTTPException(status_code=404, detail="User not found")
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