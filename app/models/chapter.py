from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.databases import Base

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)

    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    name = Column(String(200), nullable=True) # Added to store chapter names

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subject = relationship("Subject", back_populates="chapters")