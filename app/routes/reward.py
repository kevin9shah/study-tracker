from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.databases import get_db
from app.models.reward import Reward
from app.schemas.reward import RewardCreate, RewardUpdate
from app.models.user import User

router = APIRouter(prefix="/reward", tags=["Reward"])

@router.post("/")
def create_reward(reward: RewardCreate, db: Session = Depends(get_db)):
    # The user_id is the one requesting/earning the reward, so they spend the point.
    user = db.query(User).filter(User.id == reward.user_id).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    
    if (user.reward_points or 0) < 1:
        raise HTTPException(status_code=400, detail="Not enough reward points. Earn them by completing all tasks!")
    
    # Deduct point
    user.reward_points -= 1
    
    db_reward = Reward(**reward.dict())
    db.add(db_reward)
    db.commit()
    db.refresh(db_reward)
    return db_reward

@router.get("/{user_id}")
def get_rewards(user_id: int, db: Session = Depends(get_db)):
    return db.query(Reward).filter(Reward.user_id == user_id).all()

@router.patch("/redeem")
def update_reward(reward: RewardUpdate, db: Session = Depends(get_db)):
    db_reward = db.query(Reward).filter(Reward.id == reward.id).first()
    if not db_reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    db_reward.status = reward.status
    db.commit()
    db.refresh(db_reward)
    return db_reward

@router.delete("/{reward_id}")
def delete_reward(reward_id: int, db: Session = Depends(get_db)):
    db_reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not db_reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    db.delete(db_reward)
    db.commit()
    return {"message": "Reward deleted"}
