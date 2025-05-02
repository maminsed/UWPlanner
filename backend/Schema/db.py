from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import Enum, ForeignKey
from datetime import datetime
from dotenv import load_dotenv
from enum import Enum as Pyenum
import os
load_dotenv()

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
migrate = Migrate()

class LoginMethod(Pyenum):
    email  = "email"
    google = "google"
    apple  = "apple"
    github = "github" 

class Users(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(db.String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(db.String(80), unique=True, nullable=False)
    pass_hash: Mapped[str] = mapped_column(db.String(), nullable=False)
    login_method: Mapped[LoginMethod] = mapped_column(Enum(LoginMethod, name="login_method", native_enum=True, create_type=False), nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())
    last_updated_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())
    refresh_tokens: Mapped[list["JwtToken"]] = relationship("JwtToken", back_populates="user", cascade="all, delete-orphan, save-update")


    
class JwtToken(db.Model):
    jwt_token_id: Mapped[int] = mapped_column(primary_key=True)
    refresh_Token_string: Mapped[str] = mapped_column(db.String(), nullable=False)
    user_id: Mapped[int] = mapped_column(db.Integer, ForeignKey('users.id'), nullable=False)

    user: Mapped["Users"] = relationship("Users", back_populates="refresh_tokens")
