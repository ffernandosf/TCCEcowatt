"""goal and notification

Revision ID: 004
Revises: 003
Create Date: 2026-07-02

"""
import sqlalchemy as sa
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goal",
        sa.Column("device_id", sa.String(64), sa.ForeignKey("device.id"), primary_key=True),
        sa.Column("monthly_budget_brl", sa.Float(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "notification",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("device_id", sa.String(64), sa.ForeignKey("device.id"), nullable=False),
        sa.Column("type", sa.String(16), nullable=False),
        sa.Column("message", sa.String(255), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_notification_device_id", "notification", ["device_id"])
    op.create_index("ix_notification_created_at", "notification", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_notification_created_at", "notification")
    op.drop_index("ix_notification_device_id", "notification")
    op.drop_table("notification")
    op.drop_table("goal")
