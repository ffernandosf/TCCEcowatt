import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services import alerts
from app.services.aggregation import refresh_recent_rollups

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _run_rollups() -> None:
    try:
        await refresh_recent_rollups()
    except Exception:
        logger.exception("Falha ao atualizar rollups")


async def _run_alert_checks() -> None:
    try:
        await alerts.check_offline_devices()
        await alerts.check_budget_alerts()
    except Exception:
        logger.exception("Falha ao rodar verificação de alertas")


def start() -> None:
    if scheduler.running:
        return
    # A cada 5 min (e logo ao subir, pra recuperar o que passou com o processo dormindo).
    scheduler.add_job(
        _run_rollups,
        "interval",
        minutes=5,
        next_run_time=datetime.now(timezone.utc),
        id="rollups",
        replace_existing=True,
    )
    scheduler.add_job(
        _run_alert_checks, "interval", minutes=10, id="alert_checks", replace_existing=True
    )
    scheduler.start()


def stop() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
