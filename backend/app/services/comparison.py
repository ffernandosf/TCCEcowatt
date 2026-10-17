from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rollup import ReadingRollup


async def _sum_period(
    db: AsyncSession, device_id: str, start: datetime, end: datetime
) -> tuple[float, float]:
    result = await db.execute(
        select(ReadingRollup.energy_wh, ReadingRollup.cost_brl).where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == "day",
            ReadingRollup.period_start >= start,
            ReadingRollup.period_start < end,
        )
    )
    rows = result.all()
    return sum(r[0] for r in rows), sum(r[1] for r in rows)


async def compare_periods(
    db: AsyncSession, device_id: str, granularity: str, now: datetime | None = None
) -> dict:
    now = now or datetime.now(timezone.utc)

    if granularity == "week":
        current_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        previous_start = current_start - timedelta(days=7)
        previous_end = current_start
    else:
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_end = current_start
        previous_start = (current_start - timedelta(days=1)).replace(day=1)

    current_energy, current_cost = await _sum_period(db, device_id, current_start, now)
    previous_energy, previous_cost = await _sum_period(db, device_id, previous_start, previous_end)

    return {
        "granularity": granularity,
        "current": {"energy_wh": current_energy, "cost_brl": current_cost},
        "previous": {"energy_wh": previous_energy, "cost_brl": previous_cost},
    }
