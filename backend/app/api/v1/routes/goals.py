from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.models.goal import Goal
from app.schemas.goal import GoalIn, GoalOut
from app.services import goals as goals_service

router = APIRouter()


async def _build_goal_out(db: AsyncSession, device_id: str, monthly_budget_brl: float) -> GoalOut:
    now = datetime.now(timezone.utc)
    current_cost = await goals_service.month_to_date_cost(db, device_id, now)
    projected_cost = goals_service.project_month_end_cost(
        current_cost, now.day, goals_service.days_in_month(now)
    )
    percent_used = (current_cost / monthly_budget_brl * 100) if monthly_budget_brl > 0 else 0.0

    return GoalOut(
        device_id=device_id,
        monthly_budget_brl=monthly_budget_brl,
        current_cost_brl=current_cost,
        projected_cost_brl=projected_cost,
        percent_used=percent_used,
    )


@router.get("/goal", response_model=GoalOut)
async def get_goal(
    device_id: str,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)
    goal = await db.get(Goal, device_id)
    budget = goal.monthly_budget_brl if goal else 0.0
    return await _build_goal_out(db, device_id, budget)


@router.put("/goal", response_model=GoalOut)
async def set_goal(
    device_id: str,
    payload: GoalIn,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)

    goal = await db.get(Goal, device_id)
    if goal is None:
        goal = Goal(device_id=device_id, monthly_budget_brl=payload.monthly_budget_brl)
        db.add(goal)
    else:
        goal.monthly_budget_brl = payload.monthly_budget_brl
    await db.commit()

    return await _build_goal_out(db, device_id, payload.monthly_budget_brl)
