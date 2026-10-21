from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.reading import Reading
from app.services import processing, tariff


def _standby_stats(
    samples: list[tuple[datetime, float]], threshold_w: float, min_episode_seconds: float
) -> dict:
    """Percorre amostras (timestamp, power) ordenadas e soma o tempo em que a potência
    ficou continuamente abaixo do limiar de standby entre leituras consecutivas."""
    standby_seconds = 0.0
    standby_energy_wh = 0.0
    episodes = 0
    episode_seconds = 0.0

    for (t1, p1), (t2, p2) in zip(samples, samples[1:]):
        seconds = (t2 - t1).total_seconds()
        if p1 <= threshold_w and p2 <= threshold_w:
            standby_seconds += seconds
            standby_energy_wh += processing.energy_wh_between(p1, p2, seconds)
            episode_seconds += seconds
        else:
            if episode_seconds >= min_episode_seconds:
                episodes += 1
            episode_seconds = 0.0

    if episode_seconds >= min_episode_seconds:
        episodes += 1

    return {
        "standby_seconds": standby_seconds,
        "standby_energy_wh": standby_energy_wh,
        "episodes": episodes,
    }


async def compute_standby(
    db: AsyncSession, device_id: str, start: datetime, end: datetime
) -> dict:
    result = await db.execute(
        select(Reading.timestamp, Reading.power)
        .where(
            Reading.device_id == device_id,
            Reading.timestamp >= start,
            Reading.timestamp < end,
        )
        .order_by(Reading.timestamp)
    )
    samples = [(row.timestamp, row.power) for row in result.all()]

    stats = _standby_stats(
        samples, settings.standby_threshold_w, settings.standby_min_minutes * 60
    )
    rate = await tariff.effective_rate_for_device(db, device_id)

    return {
        "standby_hours": stats["standby_seconds"] / 3600,
        "standby_energy_wh": stats["standby_energy_wh"],
        "standby_cost_brl": processing.cost_brl(stats["standby_energy_wh"], rate),
        "episodes": stats["episodes"],
    }
