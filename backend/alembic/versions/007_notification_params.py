"""notification params

Revision ID: 007
Revises: 006
Create Date: 2026-10-21

"""
import re

import sqlalchemy as sa
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None

# Textos que alerts.py gravava antes de existir a coluna params.
PATTERNS = {
    "spike": (r"Pico de potência detectado: (\d+) W \(média recente (\d+) W\)", ("power_w", "baseline_w")),
    "offline": (r"há mais de (\d+) minutos", ("minutes",)),
    "limit": (r"R\$ ([\d.]+) de R\$ ([\d.]+)", ("current_brl", "budget_brl")),
}


def upgrade() -> None:
    op.add_column("notification", sa.Column("params", sa.JSON(), nullable=True))

    notification = sa.table(
        "notification",
        sa.column("id", sa.Integer()),
        sa.column("type", sa.String()),
        sa.column("message", sa.String()),
        sa.column("params", sa.JSON()),
    )
    conn = op.get_bind()
    for row in conn.execute(sa.select(notification.c.id, notification.c.type, notification.c.message)):
        pattern = PATTERNS.get(row.type)
        match = pattern and re.search(pattern[0], row.message)
        if not match:
            continue
        params = {key: float(value) for key, value in zip(pattern[1], match.groups())}
        conn.execute(
            notification.update().where(notification.c.id == row.id).values(params=params)
        )


def downgrade() -> None:
    op.drop_column("notification", "params")
