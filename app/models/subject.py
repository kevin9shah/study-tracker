# Subject:
# - id
# - name
# - uid
from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.databases import Base
from sqlalchemy.orm import relationship


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    chapters = relationship("Chapter", back_populates="subject")