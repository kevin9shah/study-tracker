from datetime import datetime
from pydantic import BaseModel

class DeadlineCreate(BaseModel):
    user_id : int
    chapter_id : int
    deadline_time : datetime
    status : str