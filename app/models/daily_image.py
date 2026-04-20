from app.db.databases import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from datetime import datetime

class DailyImage(Base):
    __tablename__ = "daily_images"
    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_data = Column(Text, nullable=False)
    is_unlocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
