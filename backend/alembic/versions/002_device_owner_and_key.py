"""device owner and key

Revision ID: 002
Revises: 001
Create Date: 2026-07-02

"""
import sqlalchemy as sa
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("device", sa.Column("owner_uid", sa.String(128), nullable=True))
    op.add_column("device", sa.Column("device_key_hash", sa.String(64), nullable=True))
    op.create_index("ix_device_owner_uid", "device", ["owner_uid"])


def downgrade() -> None:
    op.drop_index("ix_device_owner_uid", "device")
    op.drop_column("device", "device_key_hash")
    op.drop_column("device", "owner_uid")
