from datetime import datetime
from enum import Enum as Pyenum
from typing import Optional

from dotenv import load_dotenv
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Enum, ForeignKey, Table, text
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

# Many to Many relationships
minor_user = Table(
    "minor_user",
    Base.metadata,
    Column("users_id", db.Integer, ForeignKey("users.id"), primary_key=True),
    Column("minor_id", db.Integer, ForeignKey("minors.id"), primary_key=True),
)
major_specialization = Table(
    "major_specialization",
    Base.metadata,
    Column("major_id", db.Integer, ForeignKey("major.id"), primary_key=True),
    Column(
        "specialization_id",
        db.Integer,
        ForeignKey("specializations.id"),
        primary_key=True,
    ),
)


class LoginMethod(Pyenum):
    """Enums for login Methods."""

    email = "email"
    google = "google"
    apple = "apple"
    github = "github"


class Users(db.Model):
    """The Users Table."""

    # Student basic Information
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(db.String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(db.String(80), unique=True, nullable=False)
    # Authorization - Authentication Information
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
    # School related Information
    major_id: Mapped[Optional[int]] = mapped_column(ForeignKey("major.id"))
    major: Mapped[Optional["Major"]] = relationship(
        "Major", back_populates="main_major_users", foreign_keys=[major_id]
    )

    second_major_id: Mapped[Optional[int]] = mapped_column(ForeignKey("major.id"))
    second_major: Mapped[Optional["Major"]] = relationship(
        "Major", back_populates="second_major_users", foreign_keys=[second_major_id]
    )

    minors: Mapped[list["Minor"]] = relationship(
        "Minor", back_populates="users", secondary=minor_user
    )

    specialization_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("specializations.id")
    )
    specialization: Mapped[Optional["Specialization"]] = relationship(
        "Specialization", back_populates="students", foreign_keys=[specialization_id]
    )

    sequence_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sequences.id"))
    sequence: Mapped[Optional["Sequence"]] = relationship(
        "Sequence", back_populates="students", foreign_keys=[sequence_id]
    )

    # Student detailed information
    current_term: Mapped[int] = mapped_column(
        db.Integer, default=0, server_default=text("0")
    )
    started_year: Mapped[int] = mapped_column(
        db.Integer, default=datetime.now().year, server_default=text("2024")
    )
    started_month: Mapped[int] = mapped_column(
        db.Integer, default=9, server_default=text("9")
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


class Major(db.Model):
    """Database for the majors."""

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[int] = mapped_column(db.String, nullable=False)
    faculty: Mapped[str] = mapped_column(
        db.String(), nullable=False, server_default="MATH"
    )
    coop_offered: Mapped[bool] = mapped_column(
        db.Boolean, nullable=False, server_default=text("TRUE")
    )

    specializations: Mapped[list["Specialization"]] = relationship(
        "Specialization", back_populates="program", secondary=major_specialization
    )
    main_major_users: Mapped[list["Users"]] = relationship(
        "Users", back_populates="major", foreign_keys="[Users.major_id]"
    )
    second_major_users: Mapped[list["Users"]] = relationship(
        "Users", back_populates="second_major", foreign_keys="Users.second_major_id"
    )


class Minor(db.Model):
    """Database for the minors."""

    __tablename__ = "minors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(db.String(), nullable=False)
    users: Mapped[list[Optional["Users"]]] = relationship(
        "Users", back_populates="minors", secondary=minor_user
    )


class Specialization(db.Model):
    """Database for Specializations."""

    __tablename__ = "specializations"
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(), nullable=False)
    students: Mapped[list["Users"]] = relationship(
        "Users",
        back_populates="specialization",
        foreign_keys="[Users.specialization_id]",
    )


class Sequence(db.Model):
    """Database for Sequences."""

    __tablename__ = "sequences"
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(), nullable=False)
    programs: Mapped[list["Major"]] = relationship(
        "Major", back_populates="specializations", secondary=major_specialization
    )
    students: Mapped[list["Users"]] = relationship(
        "Users", back_populates="sequence", foreign_keys="[Users.sequence_id]"
    )
