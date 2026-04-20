from app.db.databases import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime

class Reward(Base):
    __tablename__ = "rewards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    status = Column(String(50), nullable=False, default="assigned")
    created_at = Column(DateTime, default=datetime.utcnow)
