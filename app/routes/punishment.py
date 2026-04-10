from fastapi import Depends, HTTPException, APIRouter
from app.db.databases import engine, Base, SessionLocal
from app.models.user import User
from fastapi.responses import JSONResponse
from app.models.punishment import Punishment
from sqlalchemy.orm import Session
from app.db.databases import get_db

from app.schemas.punishment import PunishmentCreate, PunishmentUpdate


router = APIRouter(prefix="/punishment", tags=["Punishment"])


@router.post("/")
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


@router.patch("/complete")
def update_punishment_status(punishment : PunishmentUpdate, db : Session = Depends(get_db)):
    db_punishment = db.query(Punishment).filter(Punishment.id == punishment.id).first()

    if not db_punishment:
        raise HTTPException(status_code=404, detail="Punishment not found")
    
    db_punishment.status = punishment.status # type: ignore
    db.commit()
    db.refresh(db_punishment)
    return {
        "message": "Punishment updated successfully",
        "punishment": db_punishment
    }

@router.get("/{user_id}")
def get_user_punishments(user_id: int, db: Session = Depends(get_db)):
    # Returns punishments assigned TO this user
    punishments = db.query(Punishment).filter(Punishment.user_id == user_id).all()
    return punishments

