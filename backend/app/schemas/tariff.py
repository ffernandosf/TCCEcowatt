from pydantic import BaseModel


class TariffOut(BaseModel):
    tariff_rate_brl_per_kwh: float
    tariff_flag: str
    tariff_flag_label: str
    flag_surcharge_brl_per_kwh: float
    effective_rate_brl_per_kwh: float
