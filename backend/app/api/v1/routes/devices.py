from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.models.device import Device
from app.schemas.device import (
    DeviceClaimIn,
    DeviceClaimResponse,
    DeviceOut,
    DeviceRenameIn,
    DeviceStatusOut,
)

router = APIRouter()


@router.get("/devices", response_model=list[DeviceOut])
async def list_devices(
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.owner_uid == user["uid"]).order_by(Device.created_at)
    )
    devices = result.scalars().all()
    return [DeviceOut(device_id=d.id, name=d.name or d.id) for d in devices]


@router.get("/devices/{device_id}", response_model=DeviceStatusOut)
async def get_device_status(
    device_id: str,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device = await db.get(Device, device_id)
    claimed = device is not None and device.owner_uid == user["uid"]
    return DeviceStatusOut(device_id=device_id, claimed=claimed)


@router.patch("/devices/{device_id}", response_model=DeviceOut)
async def rename_device(
    device_id: str,
    payload: DeviceRenameIn,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device = await get_owned_device(device_id, user["uid"], db)
    device.name = payload.name.strip() or device_id
    await db.commit()
    return DeviceOut(device_id=device.id, name=device.name)


@router.post("/devices/{device_id}/claim", response_model=DeviceClaimResponse)
async def claim_device(
    device_id: str,
    payload: DeviceClaimIn | None = None,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["uid"]
    device = await db.get(Device, device_id)

    if device is not None and device.owner_uid is not None and device.owner_uid != uid:
        raise HTTPException(status.HTTP_409_CONFLICT, "Dispositivo já reivindicado por outro usuário")

    name = (payload.name.strip() if payload and payload.name else None) or device_id
    device_key = security.generate_device_key()
    key_hash = security.hash_device_key(device_key)

    if device is None:
        device = Device(id=device_id, name=name, owner_uid=uid, device_key_hash=key_hash)
        db.add(device)
    else:
        device.owner_uid = uid
        device.device_key_hash = key_hash
        device.name = name

    await db.commit()

    return DeviceClaimResponse(device_id=device_id, device_key=device_key)
