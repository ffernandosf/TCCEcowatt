"""initial tables

Revision ID: 001
Revises:
Create Date: 2026-07-02

"""
import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "reading",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "device_id",
            sa.String(64),
            sa.ForeignKey("device.id"),
            nullable=False,
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("voltage", sa.Float(), nullable=True),
        sa.Column("current", sa.Float(), nullable=True),
        sa.Column("power", sa.Float(), nullable=False),
        sa.Column("energy", sa.Float(), nullable=True),
        sa.Column("frequency", sa.Float(), nullable=True),
        sa.Column("power_factor", sa.Float(), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_reading_device_id", "reading", ["device_id"])
    op.create_index("ix_reading_timestamp", "reading", ["timestamp"])


def downgrade() -> None:
    op.drop_index("ix_reading_timestamp", "reading")
    op.drop_index("ix_reading_device_id", "reading")
    op.drop_table("reading")
    op.drop_table("device")
