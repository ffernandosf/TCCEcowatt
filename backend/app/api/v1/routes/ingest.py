import asyncio

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.models.device import Device
from app.models.reading import Reading
from app.schemas.ingest import ReadingCreate, ReadingResponse
from app.services import alerts, firebase

router = APIRouter()


@router.post("/ingest", status_code=status.HTTP_201_CREATED, response_model=ReadingResponse)
async def ingest_reading(
    payload: ReadingCreate,
    db: AsyncSession = Depends(get_db),
    x_device_key: str = Header(..., alias="X-Device-Key"),
):
    device = await db.get(Device, payload.device_id)
    if device is None or device.device_key_hash is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Dispositivo não reivindicado")
    if not security.verify_device_key(x_device_key, device.device_key_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Chave de dispositivo inválida")

    reading = Reading(
        device_id=payload.device_id,
        timestamp=payload.timestamp,
        voltage=payload.voltage,
        current=payload.current,
        power=payload.power,
        energy=payload.energy,
        frequency=payload.frequency,
        power_factor=payload.power_factor,
    )
    db.add(reading)
    await db.commit()
    await db.refresh(reading)

    live_data = {
        "power": payload.power,
        "timestamp": payload.timestamp.isoformat(),
        # As regras do RTDB liberam a leitura de /live só pra esse uid.
        "owner_uid": device.owner_uid,
    }
    if payload.voltage is not None:
        live_data["voltage"] = payload.voltage
    if payload.current is not None:
        live_data["current"] = payload.current
    if payload.energy is not None:
        live_data["energy"] = payload.energy
    if payload.frequency is not None:
        live_data["frequency"] = payload.frequency
    if payload.power_factor is not None:
        live_data["power_factor"] = payload.power_factor

    await asyncio.to_thread(firebase.push_live, payload.device_id, live_data)
    await alerts.check_spike(db, payload.device_id, payload.power)

    return reading
