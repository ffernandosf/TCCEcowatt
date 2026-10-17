from pydantic import BaseModel


class HeatmapCell(BaseModel):
    weekday: int
    hour: int
    avg_power: float
    sample_count: int


class StandbyOut(BaseModel):
    standby_hours: float
    standby_energy_wh: float
    standby_cost_brl: float
    episodes: int


class CarbonOut(BaseModel):
    energy_wh: float
    carbon_kg: float
    trees_equivalent: float
