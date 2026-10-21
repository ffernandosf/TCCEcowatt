"""user tariff

Revision ID: 006
Revises: 005
Create Date: 2026-10-20

"""
import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_tariff",
        sa.Column("owner_uid", sa.String(128), primary_key=True),
        sa.Column("rate_brl_per_kwh", sa.Float(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("user_tariff")
