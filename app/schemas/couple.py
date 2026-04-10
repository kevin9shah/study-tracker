from pydantic import BaseModel

class CoupleCreate(BaseModel):
    uid1 : int

class CoupleJoin(BaseModel):
    uid2 : int
    unique_code : str

class CoupleDelete(BaseModel):
    uid: int