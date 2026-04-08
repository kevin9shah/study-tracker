from pydantic import BaseModel
from enum import Enum

class StatusEnum(str, Enum):
    pending = "pending"
    active = "active"
    completed = "completed"

class ProgressCreate(BaseModel):
    user_id : int
    chapter_id : int
    status : StatusEnum
