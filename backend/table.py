from sqlalchemy import Table, MetaData
from connect import engine

metadata = MetaData()
user_table = Table('user_table', metadata, autoload_with=engine)