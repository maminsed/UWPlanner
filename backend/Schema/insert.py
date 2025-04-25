from sqlalchemy import create_engine, insert, Table, MetaData
from sqlalchemy.sql import func
from dotenv import load_dotenv
import os

if __name__ == '__main__':
    load_dotenv()
    engine = create_engine(os.getenv('DATABASE_URL'))
    table = Table('user_table', MetaData(), autoload_with=engine)
    with engine.begin() as conn:
        conn.execute(insert(table).values(user_name='susy', pass_hash='baka', login_method=1, created_at=func.now(), last_updated_at=func.now()))