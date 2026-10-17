from datetime import datetime

from pydantic import BaseModel, Field


class ReadingCreate(BaseModel):
    device_id: str = Field(..., max_length=64)
    timestamp: datetime
    voltage: float | None = None
    current: float | None = None
    power: float
    energy: float | None = None
    frequency: float | None = None
    power_factor: float | None = None


class ReadingResponse(BaseModel):
    id: int
    device_id: str
    timestamp: datetime
    power: float

    model_config = {"from_attributes": True}
