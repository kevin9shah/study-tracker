from pydantic import BaseModel


class PunishmentCreate(BaseModel):
    user_id : int 
    task_id : int | None = None
    title : str
    status : str

class PunishmentUpdate(BaseModel):
    id : int
    status : str 