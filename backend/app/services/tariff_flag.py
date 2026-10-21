import logging
import time
import unicodedata
from dataclasses import dataclass
from datetime import date

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Valores vigentes (REH ANEEL nº 3.306/2024), usados só quando a API da ANEEL não responde.
FLAG_SURCHARGE_BRL_PER_KWH = {
    "green": 0.0,
    "yellow": 0.01885,
    "red1": 0.04463,
    "red2": 0.07877,
}

FLAG_LABEL = {
    "green": "Verde",
    "yellow": "Amarela",
    "red1": "Vermelha 1",
    "red2": "Vermelha 2",
}

# Dados abertos da ANEEL: bandeira acionada em cada mês de competência.
ANEEL_DATASTORE_URL = "https://dadosabertos.aneel.gov.br/api/3/action/datastore_search"
ANEEL_FLAG_RESOURCE_ID = "0591b8f6-fe54-437b-b72b-1aa2efd46e42"
CACHE_TTL_SECONDS = 6 * 3600
FAILURE_RETRY_SECONDS = 10 * 60


@dataclass(frozen=True)
class CurrentFlag:
    flag: str
    surcharge_brl_per_kwh: float
    reference_month: date | None
    source: str  # "aneel" ou "default"


_cache: tuple[float, CurrentFlag] | None = None


def surcharge_for(flag: str) -> float:
    return FLAG_SURCHARGE_BRL_PER_KWH.get(flag, 0.0)


def label_for(flag: str) -> str:
    return FLAG_LABEL.get(flag, flag)


def effective_tariff_rate(base_rate: float, flag: str) -> float:
    return base_rate + surcharge_for(flag)


def flag_from_aneel_name(name: str) -> str:
    """Converte o nome publicado pela ANEEL ("Vermelha P1", "Escassez Hídrica"...) no código interno."""
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    if "verde" in normalized:
        return "green"
    if "amarela" in normalized:
        return "yellow"
    if "1" in normalized:
        return "red1"
    # Patamar 2 e Escassez Hídrica: os mais caros.
    return "red2"


def parse_aneel_record(record: dict) -> CurrentFlag:
    # O adicional vem em R$/MWh com vírgula decimal (ex.: "18,85", ",00").
    surcharge_mwh = float(str(record["VlrAdicionalBandeira"]).replace(".", "").replace(",", "."))
    return CurrentFlag(
        flag=flag_from_aneel_name(record["NomBandeiraAcionada"]),
        surcharge_brl_per_kwh=surcharge_mwh / 1000,
        reference_month=date.fromisoformat(record["DatCompetencia"][:10]),
        source="aneel",
    )


def _default_flag() -> CurrentFlag:
    return CurrentFlag(
        flag=settings.tariff_flag,
        surcharge_brl_per_kwh=surcharge_for(settings.tariff_flag),
        reference_month=None,
        source="default",
    )


async def _fetch_from_aneel(today: date) -> CurrentFlag:
    params = {
        "resource_id": ANEEL_FLAG_RESOURCE_ID,
        "sort": "DatCompetencia desc",
        "limit": 3,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(ANEEL_DATASTORE_URL, params=params)
        res.raise_for_status()
    records = res.json()["result"]["records"]
    month_start = today.replace(day=1)
    # A ANEEL anuncia a bandeira do mês seguinte antes dele começar; ignora competências futuras.
    for record in records:
        parsed = parse_aneel_record(record)
        if parsed.reference_month <= month_start:
            return parsed
    raise ValueError("ANEEL não retornou bandeira para o mês atual")


async def current_flag() -> CurrentFlag:
    """Bandeira vigente segundo a ANEEL, com cache; cai no valor do .env se a API falhar."""
    global _cache
    now = time.monotonic()
    if _cache is not None and _cache[0] > now:
        return _cache[1]

    try:
        flag = await _fetch_from_aneel(date.today())
        _cache = (now + CACHE_TTL_SECONDS, flag)
    except Exception as exc:  # noqa: BLE001 — qualquer falha externa vira fallback
        logger.warning("Falha ao consultar bandeira na ANEEL: %s", exc)
        flag = _default_flag()
        _cache = (now + FAILURE_RETRY_SECONDS, flag)
    return flag
