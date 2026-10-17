"""reading rollup

Revision ID: 003
Revises: 002
Create Date: 2026-07-02

"""
import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reading_rollup",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("device_id", sa.String(64), sa.ForeignKey("device.id"), nullable=False),
        sa.Column("granularity", sa.String(8), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("energy_wh", sa.Float(), nullable=False),
        sa.Column("cost_brl", sa.Float(), nullable=False),
        sa.Column("avg_power", sa.Float(), nullable=False),
        sa.Column("min_power", sa.Float(), nullable=False),
        sa.Column("max_power", sa.Float(), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "device_id", "granularity", "period_start", name="uq_rollup_period"
        ),
    )
    op.create_index("ix_reading_rollup_device_id", "reading_rollup", ["device_id"])


def downgrade() -> None:
    op.drop_index("ix_reading_rollup_device_id", "reading_rollup")
    op.drop_table("reading_rollup")
