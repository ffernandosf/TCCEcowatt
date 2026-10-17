from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.device import Device
from app.models.reading import Reading
from app.models.rollup import ReadingRollup
from app.services import processing
from app.services.tariff_flag import effective_tariff_rate


async def compute_rollup(
    db: AsyncSession,
    device_id: str,
    granularity: str,
    period_start: datetime,
    period_end: datetime,
) -> ReadingRollup | None:
    """Recalcula e grava (upsert) o rollup de um device para um período. None se não houver leituras."""
    result = await db.execute(
        select(Reading)
        .where(
            Reading.device_id == device_id,
            Reading.timestamp >= period_start,
            Reading.timestamp < period_end,
        )
        .order_by(Reading.timestamp)
    )
    readings = result.scalars().all()
    if not readings:
        return None

    energy_wh = 0.0
    for prev, curr in zip(readings, readings[1:]):
        seconds = (curr.timestamp - prev.timestamp).total_seconds()
        energy_wh += processing.energy_wh_between(prev.power, curr.power, seconds)

    powers = [r.power for r in readings]

    existing = await db.execute(
        select(ReadingRollup).where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == granularity,
            ReadingRollup.period_start == period_start,
        )
    )
    rollup = existing.scalar_one_or_none()
    if rollup is None:
        rollup = ReadingRollup(
            device_id=device_id, granularity=granularity, period_start=period_start
        )
        db.add(rollup)

    rollup.period_end = period_end
    rollup.energy_wh = energy_wh
    rate = effective_tariff_rate(settings.tariff_rate_brl_per_kwh, settings.tariff_flag)
    rollup.cost_brl = processing.cost_brl(energy_wh, rate)
    rollup.avg_power = sum(powers) / len(powers)
    rollup.min_power = min(powers)
    rollup.max_power = max(powers)
    rollup.sample_count = len(powers)

    await db.commit()
    await db.refresh(rollup)
    return rollup


async def rollup_all_devices(
    granularity: str, period_start: datetime, period_end: datetime
) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device.id))
        device_ids = [row[0] for row in result.all()]
        for device_id in device_ids:
            await compute_rollup(db, device_id, granularity, period_start, period_end)
