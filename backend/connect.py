from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import pandas as pd
load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL')) #, echo=True if you want to see the logs

if __name__ == '__main__':
    with engine.connect() as conn:
        res = conn.execute(text('SELECT * FROM user_table'))
        rows = res.fetchall()
        cols = res.keys()
        print(pd.DataFrame(rows, columns=cols))