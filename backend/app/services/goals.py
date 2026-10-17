import calendar
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rollup import ReadingRollup


def days_in_month(now: datetime) -> int:
    return calendar.monthrange(now.year, now.month)[1]


def project_month_end_cost(current_cost_brl: float, day_of_month: int, days_in_month: int) -> float:
    """Projeta o custo do mês inteiro por extrapolação linear do gasto até agora."""
    if day_of_month <= 0:
        return current_cost_brl
    return current_cost_brl / day_of_month * days_in_month


async def month_to_date_cost(db: AsyncSession, device_id: str, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(ReadingRollup.cost_brl).where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == "day",
            ReadingRollup.period_start >= month_start,
            ReadingRollup.period_start <= now,
        )
    )
    return sum(row[0] for row in result.all())
