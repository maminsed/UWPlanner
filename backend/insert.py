from sqlalchemy import insert, text
from sqlalchemy.sql import func
from table import user_table
from connect import engine

statement = insert(user_table).values(user_name='abo',pass_hash='123456',login_method=1,created_at=func.now(),last_updated_at=func.now())

with engine.connect() as conn:
    conn.execute(statement)
    conn.commit()