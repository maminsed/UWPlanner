from datetime import datetime
from enum import Enum as Pyenum

from dotenv import load_dotenv
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum, ForeignKey, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

load_dotenv()


class Base(DeclarativeBase):
    """The model_class for SQLAlchemy."""

    pass


db = SQLAlchemy(
    model_class=Base,
    engine_options={
        "pool_pre_ping": True,
        "pool_recycle": 290,
    },
)
migrate = Migrate()


class LoginMethod(Pyenum):
    """Enums for login Methods."""

    email = "email"
    google = "google"
    apple = "apple"
    github = "github"


class Users(db.Model):
    """The Users Table."""

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(db.String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(db.String(80), unique=True, nullable=False)
    pass_hash: Mapped[str] = mapped_column(db.String(), nullable=False)
    login_method: Mapped[LoginMethod] = mapped_column(
        Enum(LoginMethod, name="login_method", native_enum=True, create_type=False),
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        db.Boolean, nullable=False, default=False, server_default=text("FALSE")
    )
    verification_code: Mapped[int] = mapped_column(
        db.Integer, nullable=False, default=0, server_default=text("0")
    )
    verification_expiration: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )
    last_updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )
    refresh_tokens: Mapped[list["JwtToken"]] = relationship(
        "JwtToken", back_populates="user", cascade="all, delete-orphan, save-update"
    )


class JwtToken(db.Model):
    """The JwtToken table."""

    __tablename__ = "jwt_token"
    jwt_token_id: Mapped[int] = mapped_column(primary_key=True)
    refresh_token_string: Mapped[str] = mapped_column(db.String(), nullable=False)
    user_id: Mapped[int] = mapped_column(
        db.Integer, ForeignKey("users.id"), nullable=False
    )

    user: Mapped["Users"] = relationship("Users", back_populates="refresh_tokens")
