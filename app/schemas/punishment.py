from pydantic import BaseModel


class PunishmentCreate(BaseModel):
    user_id : int 
    title : str
    status : str

class PunishmentUpdate(BaseModel):
    id : int
    status : str 