from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.schemas.comparison import ComparisonOut
from app.services.comparison import compare_periods

router = APIRouter()


@router.get("/comparison", response_model=ComparisonOut)
async def get_comparison(
    device_id: str,
    granularity: str = Query("month", pattern="^(week|month)$"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)
    result = await compare_periods(db, device_id, granularity)
    return ComparisonOut(**result)
