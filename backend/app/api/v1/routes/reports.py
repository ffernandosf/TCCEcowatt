from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.models.rollup import ReadingRollup
from app.services import tariff
from app.services.pdf_report import build_report_pdf

router = APIRouter()


@router.get("/report")
async def get_report(
    device_id: str,
    start: datetime = Query(..., alias="from"),
    end: datetime = Query(..., alias="to"),
    lang: str = Query("pt", pattern="^(pt|en)$"),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)

    result = await db.execute(
        select(ReadingRollup)
        .where(
            ReadingRollup.device_id == device_id,
            ReadingRollup.granularity == "day",
            ReadingRollup.period_start >= start,
            ReadingRollup.period_start < end,
        )
        .order_by(ReadingRollup.period_start)
    )
    rollups = list(result.scalars().all())

    rate = await tariff.effective_rate_for_owner(db, user["uid"])
    pdf_bytes = build_report_pdf(device_id, start, end, rollups, rate, lang)
    filename = f"{'report' if lang == 'en' else 'relatorio'}-{device_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
