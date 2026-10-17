from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rollup import ReadingRollup

TREE_ABSORPTION_KG_PER_YEAR = 21.0


def carbon_kg(energy_wh: float, intensity_kg_per_kwh: float) -> float:
    return (energy_wh / 1000) * intensity_kg_per_kwh


def trees_equivalent(carbon_kg_value: float) -> float:
    """Estimativa: 1 árvore absorve ~21kg de CO2 por ano."""
    return carbon_kg_value / TREE_ABSORPTION_KG_PER_YEAR


async def energy_wh_for_period(
    db: AsyncSession, device_id: str, start: datetime, end: datetime
) -> float:
    result = await db.execute(
        select(ReadingRollup.energy_wh).where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == "day",
            ReadingRollup.period_start >= start,
            ReadingRollup.period_start < end,
        )
    )
    return sum(row[0] for row in result.all())
