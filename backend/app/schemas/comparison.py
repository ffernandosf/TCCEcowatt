from pydantic import BaseModel


class PeriodTotals(BaseModel):
    energy_wh: float
    cost_brl: float


class ComparisonOut(BaseModel):
    granularity: str
    current: PeriodTotals
    previous: PeriodTotals
