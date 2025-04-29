from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Enum
from datetime import datetime
from dotenv import load_dotenv
from enum import Enum as Pyenum
import os
load_dotenv()

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)


class LoginMethod(Pyenum):
    email  = "email"
    google = "google"
    apple  = "apple"
    github = "github"

class Users(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(db.String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(db.String(80), unique=True)
    pass_hash: Mapped[str] = mapped_column(db.String(80), nullable=False)
    login_method: Mapped[LoginMethod] = mapped_column(Enum(LoginMethod, name="login_method", native_enum=True, create_type=False), nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.TIMESTAMP, nullable=False)
    last_updated_at: Mapped[datetime] = mapped_column(db.TIMESTAMP, nullable=False)
    academic_info_id: Mapped[int | None] = mapped_column(db.Integer)