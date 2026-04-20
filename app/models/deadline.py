from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.databases import Base
from datetime import datetime
class Deadline(Base):
    __tablename__ = "deadlines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)

    deadline_time = Column(DateTime, nullable=False)
    status = Column(String(50))
    secret_message = Column(String(500), nullable=True)
    created_at = Column(DateTime,default = datetime.utcnow)