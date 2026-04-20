from sqlalchemy import Column, Integer, String, DateTime
from app.db.databases import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    last_active = Column(DateTime, default=datetime.utcnow)