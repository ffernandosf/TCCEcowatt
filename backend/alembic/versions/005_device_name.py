"""device name

Revision ID: 005
Revises: 004
Create Date: 2026-07-02

"""
import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("device", sa.Column("name", sa.String(80), nullable=True))


def downgrade() -> None:
    op.drop_column("device", "name")
