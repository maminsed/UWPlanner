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

major_student = Table(
    "major_student",
    Base.metadata,
    Column("students_id", db.Integer, ForeignKey("users.id"), primary_key=True),
    Column("major_id", db.Integer, ForeignKey("major.id"), primary_key=True),
)

specialization_student = Table(
    "specialization_student",
    Base.metadata,
    Column("spec_id", db.Integer, ForeignKey("specializations.id"), primary_key=True),
    Column("user_id", db.Integer, ForeignKey("users.id"), primary_key=True),
)

major_sequence = Table(
    "major_sequence",
    Base.metadata,
    Column("major_id", db.Integer, ForeignKey("major.id"), primary_key=True),
    Column("sequence_id", db.Integer, ForeignKey("sequences.id"), primary_key=True),
)

major_spec = Table(
    "major_spec",
    Base.metadata,
    Column("spec_id", db.Integer, ForeignKey("specializations.id"), primary_key=True),
    Column("major_id", db.Integer, ForeignKey("major.id"), primary_key=True),
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
    majors: Mapped[list["Major"]] = relationship(
        "Major", back_populates="students", secondary=major_student
    )

    minors: Mapped[list["Minor"]] = relationship(
        "Minor", back_populates="users", secondary=minor_user
    )

    specializations: Mapped[list["Specialization"]] = relationship(
        "Specialization", back_populates="students", secondary=specialization_student
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
    started_month: Mapped[int] = mapped_column(db.Integer, default=1)  # {0:"Summer", 1:"Fall", 2:"Winter"}
    coop: Mapped[bool] = mapped_column(db.Boolean(), default=True)
    bio: Mapped[str] = mapped_column(db.String(), default="", nullable=False)
    # seprated with - 
    path: Mapped[str] = mapped_column(db.String(), default="", server_default="")
    links: Mapped[list["Link"]] = relationship(
        "Link", back_populates="user", cascade="all, delete-orphan, save-update"
    )

    #Course paths: Follow UWFLOW ids!!
    # A set of ids for the current sems courses seprated with - 
    # section_ids: Mapped[str] = mapped_column(db.String(), default="", server_default="") 
    schedules: Mapped[list["Schedule"]] = relationship("Schedule", back_populates="user", cascade="all, delete-orphan, save-update")
    # A set of Names for future semester courses, coruses seprated with - semesters seprated with //
    course_ids: Mapped[str] = mapped_column(db.String, default="", server_default="")


class Link(db.Model):
    __tablename__ = "link"
    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(db.String(), nullable=True)
    user_id: Mapped[int] = mapped_column(
        db.Integer, ForeignKey("users.id"), nullable=False
    )
    user: Mapped["Users"] = relationship("Users", back_populates="links")


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

    __tablename__ = "major"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(db.String, nullable=False, unique=True)
    faculty: Mapped[str] = mapped_column(db.String(), nullable=False)
    url: Mapped[str] = mapped_column(
        db.String(),
        nullable=False,
        server_default="https://uwaterloo.ca/future-students/programs/by-faculty",
    )
    coop: Mapped[bool] = mapped_column(
        db.Boolean, nullable=False, server_default=text("FALSE")
    )
    regular: Mapped[bool] = mapped_column(
        db.Boolean, nullable=False, server_default=text("TRUE")
    )
    students: Mapped[list["Major"]] = relationship(
        "Users", back_populates="majors", secondary=major_student
    )
    specializations: Mapped[list["Specialization"]] = relationship(
        "Specialization", back_populates="majors", secondary=major_spec
    )
    sequences: Mapped[list["Sequence"]] = relationship(
        "Sequence", back_populates="majors", secondary=major_sequence
    )


class Minor(db.Model):
    """Database for the minors."""

    __tablename__ = "minors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(db.String(), nullable=False, unique=True)
    theme: Mapped[str] = mapped_column(db.String(), nullable=True)
    url: Mapped[str] = mapped_column(
        db.String(),
        server_default="https://uwaterloo.ca/future-students/programs/minors",
    )
    users: Mapped[list[Optional["Users"]]] = relationship(
        "Users", back_populates="minors", secondary=minor_user
    )


class Specialization(db.Model):
    """Database for Specializations."""

    __tablename__ = "specializations"
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(), nullable=False)
    field: Mapped[str] = mapped_column(db.String())
    link: Mapped[Optional[str]] = mapped_column(db.String())
    majors: Mapped[list["Major"]] = relationship(
        "Major", back_populates="specializations", secondary=major_spec
    )
    is_option: Mapped[bool] = mapped_column(server_default=text("FALSE"))
    students: Mapped[list["Users"]] = relationship(
        "Users", back_populates="specializations", secondary=specialization_student
    )


class Sequence(db.Model):
    """Database for Sequences."""

    __tablename__ = "sequences"
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(), nullable=False)
    students: Mapped[list["Users"]] = relationship(
        "Users", back_populates="sequence", foreign_keys="[Users.sequence_id]"
    )
    plan: Mapped[str] = mapped_column(db.String(), nullable=False)
    majors: Mapped[list["Major"]] = relationship(
        "Major", back_populates="sequences", secondary=major_sequence
    )


class Course(db.Model):
    """Database for Courses."""

    __tablename__ = "courses"
    course_id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    offeredIn: Mapped[str] = mapped_column(db.String(), default="")
    
    code: Mapped[str] = mapped_column(db.String()) #e.g. MATH
    name: Mapped[str] = mapped_column(db.String(), default="") #e.g. Linear Algebra 2
    description: Mapped[str] = mapped_column(db.String(), default="")

    prereqs: Mapped[str] = mapped_column(db.String(), default="", server_default="")
    coreqs: Mapped[str] = mapped_column(db.String(), default="", server_default="")
    antireqs: Mapped[str] = mapped_column(db.String(), default="", server_default="")

class Schedule(db.Model):
    """Database for Sections."""

    __tablename__ = "schedules"
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    term_id: Mapped[int] = mapped_column(db.Integer)
    user_id: Mapped[int] = mapped_column(db.Integer, ForeignKey("users.id"))
    user: Mapped["Users"] = relationship("Users", back_populates="schedules")
    sections: Mapped[str] = mapped_column(db.String())
