from sqlalchemy import Column, Integer, ForeignKey, String
from app.db.databases import Base
from sqlalchemy.orm import Mapped, mapped_column

class Couple(Base):
    __tablename__ = "couples"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    uid1: Mapped[int] = mapped_column(ForeignKey("users.id"))
    uid2: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    unique_code: Mapped[str] = mapped_column(String(6), unique=True)
    status: Mapped[str] = mapped_column(String(10),default="pending")