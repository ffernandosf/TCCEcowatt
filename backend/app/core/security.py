import asyncio
import hashlib
import hmac
import logging
import secrets

from fastapi import Header, HTTPException, status

from app.services import firebase

logger = logging.getLogger(__name__)


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Valida o ID token Firebase do header Authorization e retorna o token decodificado."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token ausente ou mal formatado")
    token = authorization.removeprefix("Bearer ").strip()

    app = firebase.get_app()
    if app is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Firebase não configurado")

    from firebase_admin import auth as firebase_auth

    try:
        return await asyncio.to_thread(firebase_auth.verify_id_token, token, app=app)
    except Exception as exc:
        logger.info("Falha na validação do ID token: %s", exc)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado") from exc


def generate_device_key() -> str:
    return secrets.token_urlsafe(32)


def hash_device_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def verify_device_key(key: str, key_hash: str) -> bool:
    return hmac.compare_digest(hash_device_key(key), key_hash)
