from sqlalchemy import Column, Integer, ForeignKey
from app.db.databases import Base

class Couple(Base):
    __tablename__ = "couples"

    id = Column(Integer, primary_key=True, index=True)

    uid1 = Column(Integer, ForeignKey("users.id"), nullable=False)
    uid2 = Column(Integer, ForeignKey("users.id"), nullable=False)