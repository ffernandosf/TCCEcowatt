from fastapi import APIRouter, Depends

from app.core import security
from app.core.config import settings
from app.schemas.tariff import TariffOut
from app.services import tariff_flag

router = APIRouter()


@router.get("/tariff", response_model=TariffOut)
async def get_tariff(user: dict = Depends(security.get_current_user)):
    surcharge = tariff_flag.surcharge_for(settings.tariff_flag)
    return TariffOut(
        tariff_rate_brl_per_kwh=settings.tariff_rate_brl_per_kwh,
        tariff_flag=settings.tariff_flag,
        tariff_flag_label=tariff_flag.label_for(settings.tariff_flag),
        flag_surcharge_brl_per_kwh=surcharge,
        effective_rate_brl_per_kwh=settings.tariff_rate_brl_per_kwh + surcharge,
    )
