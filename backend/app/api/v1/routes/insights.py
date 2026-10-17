from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.schemas.insights import CarbonOut, HeatmapCell, StandbyOut
from app.services import carbon as carbon_service
from app.services import heatmap as heatmap_service
from app.services import standby as standby_service

router = APIRouter()


@router.get("/heatmap", response_model=list[HeatmapCell])
async def get_heatmap(
    device_id: str,
    start: datetime = Query(..., alias="from"),
    end: datetime = Query(..., alias="to"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)
    return await heatmap_service.compute_heatmap(db, device_id, start, end)


@router.get("/standby", response_model=StandbyOut)
async def get_standby(
    device_id: str,
    start: datetime = Query(..., alias="from"),
    end: datetime = Query(..., alias="to"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)
    result = await standby_service.compute_standby(db, device_id, start, end)
    return StandbyOut(**result)


@router.get("/carbon", response_model=CarbonOut)
async def get_carbon(
    device_id: str,
    start: datetime = Query(..., alias="from"),
    end: datetime = Query(..., alias="to"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)
    energy_wh = await carbon_service.energy_wh_for_period(db, device_id, start, end)
    co2 = carbon_service.carbon_kg(energy_wh, settings.carbon_intensity_kg_per_kwh)
    return CarbonOut(
        energy_wh=energy_wh,
        carbon_kg=co2,
        trees_equivalent=carbon_service.trees_equivalent(co2),
    )
