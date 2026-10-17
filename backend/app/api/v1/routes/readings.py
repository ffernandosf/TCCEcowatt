from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.models.reading import Reading
from app.models.rollup import ReadingRollup
from app.schemas.reading import DashboardSummary, ReadingOut
from app.services import aggregation

router = APIRouter()


@router.get("/readings", response_model=list[ReadingOut])
async def list_readings(
    device_id: str,
    start: datetime = Query(..., alias="from"),
    end: datetime = Query(..., alias="to"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)

    result = await db.execute(
        select(Reading)
        .where(
            Reading.device_id == device_id,
            Reading.timestamp >= start,
            Reading.timestamp < end,
        )
        .order_by(Reading.timestamp)
    )
    return result.scalars().all()


@router.get("/dashboard", response_model=DashboardSummary)
async def dashboard(
    device_id: str,
    start: datetime = Query(..., alias="from"),
    end: datetime = Query(..., alias="to"),
    granularity: str = Query("hour", pattern="^(hour|day)$"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)
    await aggregation.refresh_current_rollup(db, device_id, granularity)

    result = await db.execute(
        select(ReadingRollup)
        .where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == granularity,
            ReadingRollup.period_start >= start,
            ReadingRollup.period_start < end,
        )
        .order_by(ReadingRollup.period_start)
    )
    rollups = result.scalars().all()

    return DashboardSummary(
        device_id=device_id,
        granularity=granularity,
        tariff_rate_brl_per_kwh=settings.tariff_rate_brl_per_kwh,
        total_energy_wh=sum(r.energy_wh for r in rollups),
        total_cost_brl=sum(r.cost_brl for r in rollups),
        rollups=list(rollups),
    )
