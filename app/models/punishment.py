from app.db.databases import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime

class Punishment(Base):
    __tablename__ = "punishments"
    
    id = Column(Integer, primary_key = True, index = True)
    user_id = Column(Integer, ForeignKey("users.id") , nullable = False)
    title = Column(String(200), nullable = False)
    status = Column(String(10), nullable = False)
    