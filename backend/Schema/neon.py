from sqlalchemy import create_engine,text
from dotenv import load_dotenv
import os, pandas as pd

def print_table(table_name, cols=["*"]):
    """
        prints the table at table_name with cols. mainly a utility function for development
    """
    load_dotenv()
    engine = create_engine(os.getenv('DATABASE_URL'))
    colText = ""
    for col in cols:
        colText+=col+','
    colText =colText[:-1]
    with engine.connect() as conn:
        res = conn.execute(text(f'SELECT {colText} FROM {table_name}'))
        rows = res.fetchall()
        cols = res.keys()
        print(pd.DataFrame(rows,columns=cols))
