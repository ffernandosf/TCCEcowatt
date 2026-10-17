from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReadingRollup(Base):
    __tablename__ = "reading_rollup"
    __table_args__ = (
        UniqueConstraint("device_id", "granularity", "period_start", name="uq_rollup_period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("device.id"), nullable=False, index=True
    )
    granularity: Mapped[str] = mapped_column(String(8), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    energy_wh: Mapped[float] = mapped_column(Float, nullable=False)
    cost_brl: Mapped[float] = mapped_column(Float, nullable=False)
    avg_power: Mapped[float] = mapped_column(Float, nullable=False)
    min_power: Mapped[float] = mapped_column(Float, nullable=False)
    max_power: Mapped[float] = mapped_column(Float, nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
