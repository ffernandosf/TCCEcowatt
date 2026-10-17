import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services import alerts
from app.services.aggregation import rollup_all_devices

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _run_hourly_rollup() -> None:
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    period_start = now - timedelta(hours=1)
    try:
        await rollup_all_devices("hour", period_start, now)
    except Exception:
        logger.exception("Falha ao rodar rollup horário")


async def _run_daily_rollup() -> None:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    period_start = today - timedelta(days=1)
    try:
        await rollup_all_devices("day", period_start, today)
    except Exception:
        logger.exception("Falha ao rodar rollup diário")


async def _run_alert_checks() -> None:
    try:
        await alerts.check_offline_devices()
        await alerts.check_budget_alerts()
    except Exception:
        logger.exception("Falha ao rodar verificação de alertas")


def start() -> None:
    if scheduler.running:
        return
    scheduler.add_job(_run_hourly_rollup, "cron", minute=5, id="hourly_rollup", replace_existing=True)
    scheduler.add_job(_run_daily_rollup, "cron", hour=0, minute=10, id="daily_rollup", replace_existing=True)
    scheduler.add_job(
        _run_alert_checks, "interval", minutes=10, id="alert_checks", replace_existing=True
    )
    scheduler.start()


def stop() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
