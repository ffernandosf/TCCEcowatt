from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    params: dict[str, float] | None = None
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
