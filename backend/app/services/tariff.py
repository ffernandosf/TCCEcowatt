from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device import Device
from app.models.user_tariff import UserTariff
from app.services import tariff_flag


async def base_rate_for_owner(db: AsyncSession, owner_uid: str | None) -> tuple[float, bool]:
    """Tarifa base (R$/kWh) informada pelo usuário e se ele já a configurou.

    Sem tarifa cadastrada, usa o padrão do .env pra não zerar os custos.
    """
    if owner_uid:
        user_tariff = await db.get(UserTariff, owner_uid)
        if user_tariff is not None:
            return user_tariff.rate_brl_per_kwh, True
    return settings.tariff_rate_brl_per_kwh, False


async def effective_rate_for_owner(db: AsyncSession, owner_uid: str | None) -> float:
    base_rate, _ = await base_rate_for_owner(db, owner_uid)
    flag = await tariff_flag.current_flag()
    return base_rate + flag.surcharge_brl_per_kwh


async def effective_rate_for_device(db: AsyncSession, device_id: str) -> float:
    device = await db.get(Device, device_id)
    return await effective_rate_for_owner(db, device.owner_uid if device else None)
