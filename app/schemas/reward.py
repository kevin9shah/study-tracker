from pydantic import BaseModel

class RewardCreate(BaseModel):
    user_id: int
    assigner_id: int
    title: str
    status: str = "assigned"

class RewardUpdate(BaseModel):
    id: int
    status: str
