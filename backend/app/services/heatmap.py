from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rollup import ReadingRollup


async def compute_heatmap(
    db: AsyncSession, device_id: str, start: datetime, end: datetime
) -> list[dict]:
    """Consumo médio por (dia da semana, hora), a partir dos rollups horários já calculados."""
    result = await db.execute(
        select(ReadingRollup.period_start, ReadingRollup.avg_power).where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == "hour",
            ReadingRollup.period_start >= start,
            ReadingRollup.period_start < end,
        )
    )

    buckets: dict[tuple[int, int], list[float]] = defaultdict(list)
    for period_start, avg_power in result.all():
        buckets[(period_start.weekday(), period_start.hour)].append(avg_power)

    return [
        {"weekday": weekday, "hour": hour, "avg_power": sum(values) / len(values), "sample_count": len(values)}
        for (weekday, hour), values in sorted(buckets.items())
    ]
