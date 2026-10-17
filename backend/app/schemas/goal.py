from pydantic import BaseModel


class GoalIn(BaseModel):
    monthly_budget_brl: float


class GoalOut(BaseModel):
    device_id: str
    monthly_budget_brl: float
    current_cost_brl: float
    projected_cost_brl: float
    percent_used: float
