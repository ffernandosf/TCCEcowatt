from pydantic import BaseModel


class DeviceClaimIn(BaseModel):
    name: str | None = None


class DeviceClaimResponse(BaseModel):
    device_id: str
    device_key: str


class DeviceStatusOut(BaseModel):
    device_id: str
    claimed: bool


class DeviceOut(BaseModel):
    device_id: str
    name: str


class DeviceRenameIn(BaseModel):
    name: str
