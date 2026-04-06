from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.databases import Base
from datetime import datetime
class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id") , nullable = False)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable = False)
    status = Column(String(30))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    