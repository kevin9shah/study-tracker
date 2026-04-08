from pydantic import BaseModel



class ChapterCreate(BaseModel):
    subject_id : int
    chapter_number : int
    subject : str
