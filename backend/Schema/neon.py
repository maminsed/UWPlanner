from sqlalchemy import MetaData, create_engine, Table, text
from dotenv import load_dotenv
import os

def execute_stmt(statement, table_name: str):
    load_dotenv()
    engine = create_engine(os.getenv('DATABASE_URL'))
    metadata = MetaData()
    table = Table(table_name, metadata=metadata, autoload_with=engine)
    with engine.begin() as conn:
        if type(statement) == str:
            conn.execute(text(statement))
        else:
            conn.execute(statement)

def print_table(table_name, cols):
    pass