from pydantic import BaseModel

class DailyImageCreate(BaseModel):
    uploader_id: int
    receiver_id: int
    image_data: str

class DailyImageUpdate(BaseModel):
    id: int
    is_unlocked: bool
