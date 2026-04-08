from pydantic import BaseModel


class PunishmentCreate(BaseModel):
    user_id : int 
    title : str
    status : str
