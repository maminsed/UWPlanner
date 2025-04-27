from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
from dotenv import load_dotenv
import os
load_dotenv()

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
db.init_app(app)

class Users(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_name: Mapped[str] = mapped_column(db.String(50), nullable=False, unique=True)
    pass_hash: Mapped[str] = mapped_column(db.String(80), nullable=False)
    login_method: Mapped[int] = mapped_column(db.SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.TIMESTAMP, nullable=False)
    last_updated_at: Mapped[datetime] = mapped_column(db.TIMESTAMP, nullable=False)
    academic_info_id: Mapped[int | None] = mapped_column(db.Integer)

with app.app_context():
    db.create_all()