from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.device import Device
from app.models.goal import Goal
from app.models.notification import Notification
from app.models.reading import Reading
from app.models.rollup import ReadingRollup
from app.services import goals as goals_service

OFFLINE_THRESHOLD_MINUTES = 30
SPIKE_FACTOR = 3.0
SPIKE_MIN_POWER_W = 50.0
DEDUPE_MINUTES = {"offline": OFFLINE_THRESHOLD_MINUTES, "limit": 24 * 60, "spike": 15}


async def _recent_notification_exists(
    db: AsyncSession, device_id: str, type_: str, within_minutes: int
) -> bool:
    since = datetime.now(timezone.utc) - timedelta(minutes=within_minutes)
    result = await db.execute(
        select(Notification.id)
        .where(
            Notification.device_id == device_id,
            Notification.type == type_,
            Notification.created_at >= since,
        )
        .limit(1)
    )
    return result.first() is not None


async def _create_notification(
    db: AsyncSession, device_id: str, type_: str, message: str, params: dict[str, float]
) -> None:
    db.add(Notification(device_id=device_id, type=type_, message=message, params=params))
    await db.commit()


async def check_spike(db: AsyncSession, device_id: str, power: float) -> None:
    """Compara a leitura atual com a média das últimas 24h de rollups horários."""
    if power < SPIKE_MIN_POWER_W:
        return

    result = await db.execute(
        select(ReadingRollup.avg_power)
        .where(ReadingRollup.device_id == device_id, ReadingRollup.granularity == "hour")
        .order_by(ReadingRollup.period_start.desc())
        .limit(24)
    )
    avg_powers = [row[0] for row in result.all()]
    if not avg_powers:
        return

    baseline = sum(avg_powers) / len(avg_powers)
    if baseline <= 0 or power < baseline * SPIKE_FACTOR:
        return

    if await _recent_notification_exists(db, device_id, "spike", DEDUPE_MINUTES["spike"]):
        return

    await _create_notification(
        db,
        device_id,
        "spike",
        f"Pico de potência detectado: {power:.0f} W (média recente {baseline:.0f} W)",
        {"power_w": round(power), "baseline_w": round(baseline)},
    )


async def check_offline_devices() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=OFFLINE_THRESHOLD_MINUTES)
        result = await db.execute(select(Device).where(Device.owner_uid.is_not(None)))
        devices = result.scalars().all()

        for device in devices:
            last_reading = await db.execute(
                select(Reading.timestamp)
                .where(Reading.device_id == device.id)
                .order_by(Reading.timestamp.desc())
                .limit(1)
            )
            last_ts = last_reading.scalar_one_or_none()
            if last_ts is None or last_ts >= cutoff:
                continue
            if await _recent_notification_exists(db, device.id, "offline", OFFLINE_THRESHOLD_MINUTES):
                continue
            await _create_notification(
                db,
                device.id,
                "offline",
                f"Dispositivo sem leituras há mais de {OFFLINE_THRESHOLD_MINUTES} minutos",
                {"minutes": OFFLINE_THRESHOLD_MINUTES},
            )


async def check_budget_alerts() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Goal))
        for goal in result.scalars().all():
            current_cost = await goals_service.month_to_date_cost(db, goal.device_id)
            if current_cost < goal.monthly_budget_brl:
                continue
            if await _recent_notification_exists(db, goal.device_id, "limit", DEDUPE_MINUTES["limit"]):
                continue
            await _create_notification(
                db,
                goal.device_id,
                "limit",
                f"Meta mensal ultrapassada: R$ {current_cost:.2f} de R$ {goal.monthly_budget_brl:.2f}",
                {
                    "current_brl": round(current_cost, 2),
                    "budget_brl": round(goal.monthly_budget_brl, 2),
                },
            )
