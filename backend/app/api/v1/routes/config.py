from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.models.user_tariff import UserTariff
from app.schemas.tariff import TariffIn, TariffOut
from app.services import aggregation, tariff, tariff_flag

router = APIRouter()


async def _build_tariff_out(db: AsyncSession, uid: str) -> TariffOut:
    base_rate, configured = await tariff.base_rate_for_owner(db, uid)
    flag = await tariff_flag.current_flag()
    return TariffOut(
        tariff_rate_brl_per_kwh=base_rate,
        rate_configured=configured,
        tariff_flag=flag.flag,
        tariff_flag_label=tariff_flag.label_for(flag.flag),
        flag_source=flag.source,
        flag_reference_month=flag.reference_month,
        flag_surcharge_brl_per_kwh=flag.surcharge_brl_per_kwh,
        effective_rate_brl_per_kwh=base_rate + flag.surcharge_brl_per_kwh,
    )


@router.get("/tariff", response_model=TariffOut)
async def get_tariff(
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _build_tariff_out(db, user["uid"])


@router.put("/tariff", response_model=TariffOut)
async def set_tariff(
    payload: TariffIn,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_tariff = await db.get(UserTariff, user["uid"])
    if user_tariff is None:
        db.add(UserTariff(owner_uid=user["uid"], rate_brl_per_kwh=payload.tariff_rate_brl_per_kwh))
    else:
        user_tariff.rate_brl_per_kwh = payload.tariff_rate_brl_per_kwh
    await db.commit()

    # Recalcula o mês corrente pra meta, comparativos e relatório já refletirem a nova tarifa.
    await aggregation.refresh_owner_month(db, user["uid"])
    return await _build_tariff_out(db, user["uid"])
