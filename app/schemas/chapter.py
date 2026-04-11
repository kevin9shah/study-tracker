from app.models import subject
from pydantic import BaseModel



class ChapterCreate(BaseModel):
    subject_id : int
    chapter_number : int
    subject : str


class ChapterDelete(BaseModel):
    subject_id : int 
    chapter_number : int 
    subject : str 