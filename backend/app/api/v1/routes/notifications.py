from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.database import get_db
from app.core.deps import get_owned_device
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter()


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    device_id: str,
    unread_only: bool = Query(False),
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_device(device_id, user["uid"], db)

    query = select(Notification).where(Notification.device_id == device_id)
    if unread_only:
        query = query.where(Notification.read.is_(False))
    query = query.order_by(Notification.created_at.desc()).limit(100)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: int,
    user: dict = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = await db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notificação não encontrada")
    await get_owned_device(notification.device_id, user["uid"], db)

    notification.read = True
    await db.commit()
    await db.refresh(notification)
    return notification
