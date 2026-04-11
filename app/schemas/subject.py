from pydantic import BaseModel


class SubjectCreate(BaseModel):
    id : int
    name : str
    user_id : int 

class SubjectDelete(BaseModel):
    id : int
    name : str 
    user_id : int