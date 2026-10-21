from datetime import date

from pydantic import BaseModel, Field


class TariffIn(BaseModel):
    tariff_rate_brl_per_kwh: float = Field(gt=0, le=5)


class TariffOut(BaseModel):
    tariff_rate_brl_per_kwh: float
    rate_configured: bool
    tariff_flag: str
    tariff_flag_label: str
    flag_source: str
    flag_reference_month: date | None
    flag_surcharge_brl_per_kwh: float
    effective_rate_brl_per_kwh: float
