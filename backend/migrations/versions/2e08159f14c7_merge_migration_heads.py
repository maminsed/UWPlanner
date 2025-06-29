"""merge migration heads

Revision ID: 2e08159f14c7
Revises: 2a3e57505158, 55e6d69852df
Create Date: 2025-06-29 01:06:48.541947

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2e08159f14c7'
down_revision = ('2a3e57505158', '55e6d69852df')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
