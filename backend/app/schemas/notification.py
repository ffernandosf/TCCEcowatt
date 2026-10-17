from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
