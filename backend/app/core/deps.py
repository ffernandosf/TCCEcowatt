from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device


async def get_owned_device(device_id: str, uid: str, db: AsyncSession) -> Device:
    device = await db.get(Device, device_id)
    if device is None or device.owner_uid != uid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispositivo não encontrado")
    return device
