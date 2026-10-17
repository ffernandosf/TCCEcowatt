from datetime import datetime

from pydantic import BaseModel


class ReadingOut(BaseModel):
    id: int
    timestamp: datetime
    voltage: float | None
    current: float | None
    power: float
    energy: float | None
    frequency: float | None
    power_factor: float | None

    model_config = {"from_attributes": True}


class RollupOut(BaseModel):
    period_start: datetime
    period_end: datetime
    energy_wh: float
    cost_brl: float
    avg_power: float
    min_power: float
    max_power: float
    sample_count: int

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    device_id: str
    granularity: str
    tariff_rate_brl_per_kwh: float
    total_energy_wh: float
    total_cost_brl: float
    rollups: list[RollupOut]
