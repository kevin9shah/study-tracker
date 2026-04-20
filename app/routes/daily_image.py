from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.models.daily_image import DailyImage
from app.schemas.daily_image import DailyImageCreate, DailyImageUpdate
from sqlalchemy import desc

router = APIRouter(prefix="/daily_image", tags=["DailyImage"])

@router.post("/")
def upload_daily_image(image_in: DailyImageCreate, db: Session = Depends(get_db)):
    db_image = DailyImage(**image_in.dict())
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

@router.get("/{receiver_id}")
def get_daily_image(receiver_id: int, db: Session = Depends(get_db)):
    image = db.query(DailyImage).filter(DailyImage.receiver_id == receiver_id).order_by(desc(DailyImage.created_at)).first()
    if not image:
        raise HTTPException(status_code=404, detail="No image found")
    return image

@router.patch("/unlock")
def unlock_image(update_data: DailyImageUpdate, db: Session = Depends(get_db)):
    db_image = db.query(DailyImage).filter(DailyImage.id == update_data.id).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    db_image.is_unlocked = update_data.is_unlocked
    db.commit()
    db.refresh(db_image)
    return db_image
