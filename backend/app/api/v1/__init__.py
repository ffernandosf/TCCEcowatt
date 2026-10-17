from fastapi import APIRouter

from app.api.v1.routes import (
    comparison,
    config,
    devices,
    goals,
    ingest,
    insights,
    notifications,
    readings,
    reports,
)

router = APIRouter(prefix="/api/v1")
router.include_router(ingest.router, tags=["ingest"])
router.include_router(devices.router, tags=["devices"])
router.include_router(readings.router, tags=["readings"])
router.include_router(config.router, tags=["config"])
router.include_router(goals.router, tags=["goals"])
router.include_router(notifications.router, tags=["notifications"])
router.include_router(comparison.router, tags=["comparison"])
router.include_router(reports.router, tags=["reports"])
router.include_router(insights.router, tags=["insights"])
