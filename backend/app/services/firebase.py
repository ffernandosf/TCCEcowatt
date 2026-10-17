import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)
_app = None


def get_app():
    global _app
    if _app is not None:
        return _app
    if not settings.firebase_database_url:
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials

        cert = (
            json.loads(settings.firebase_service_account_json)
            if settings.firebase_service_account_json
            else settings.firebase_service_account_path
        )
        cred = credentials.Certificate(cert)
        _app = firebase_admin.initialize_app(
            cred, {"databaseURL": settings.firebase_database_url}
        )
        return _app
    except Exception as exc:
        logger.warning("Firebase init failed: %s", exc)
        return None


def push_live(device_id: str, data: dict) -> None:
    if get_app() is None:
        return
    try:
        from firebase_admin import db

        db.reference(f"/devices/{device_id}/live").set(data)
    except Exception as exc:
        logger.warning("Firebase push failed for device %s: %s", device_id, exc)
