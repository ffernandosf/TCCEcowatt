from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserTariff(Base):
    __tablename__ = "user_tariff"

    owner_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    rate_brl_per_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
