# ruff: noqa: D101,D102

import re
from typing import Annotated, TypeVar

from flask import jsonify, request
from flask.typing import ResponseReturnValue
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

NonEmptyStr = Annotated[str, Field(min_length=1)]
EmailValue = Annotated[str, Field(min_length=3, max_length=254)]
PasswordValue = Annotated[str, Field(min_length=8, max_length=128)]
UsernameValue = Annotated[
    str,
    Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]*$"),
]
CourseCodeValue = Annotated[str, Field(min_length=2, max_length=20)]
TRequestSchema = TypeVar("TRequestSchema", bound="RequestSchema")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SEQUENCE_TERM_RE = re.compile(r"^([1-6][AB]|WT[1-6]|Study|Coop)$")


def validate_email(value: str | None) -> str | None:
    """Validate an email string without adding another dependency."""
    if value is None:
        return value
    if not EMAIL_RE.fullmatch(value):
        raise ValueError("invalid email address")
    return value.lower()


def validate_waterloo_term_id(value: int) -> int:
    """Validate Waterloo-style term ids such as 1259."""
    if value < 1000 or value > 2000 or value % 10 not in {1, 5, 9}:
        raise ValueError("invalid Waterloo term id")
    return value


class RequestSchema(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


def _validation_error_response(
    exc: ValidationError, source: str
) -> ResponseReturnValue:
    errors = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error["loc"])
        errors.append(
            {
                "field": loc or source,
                "message": error["msg"],
                "type": error["type"],
            }
        )
    return jsonify({"message": f"{source} did not match schema", "errors": errors}), 400


def parse_json_body(
    schema: type[TRequestSchema],
) -> tuple[TRequestSchema | None, ResponseReturnValue | None]:
    """Validate the current request JSON body against a Pydantic schema."""
    try:
        payload = request.get_json(silent=True)
        if payload is None:
            payload = {}
        return schema.model_validate(payload), None
    except ValidationError as exc:
        return None, _validation_error_response(exc, "request body")


def parse_query_params(
    schema: type[TRequestSchema],
) -> tuple[TRequestSchema | None, ResponseReturnValue | None]:
    """Validate the current request query parameters against a Pydantic schema."""
    try:
        return schema.model_validate(request.args.to_dict(flat=True)), None
    except ValidationError as exc:
        return None, _validation_error_response(exc, "query parameters")


class SignupRequest(RequestSchema):
    email: EmailValue
    password: PasswordValue

    _validate_email = field_validator("email")(validate_email)


class LoginRequest(RequestSchema):
    password: Annotated[str, Field(min_length=1, max_length=128)]
    username: UsernameValue | None = None
    email: EmailValue | None = None

    _validate_email = field_validator("email")(validate_email)

    @model_validator(mode="after")
    def require_username_or_email(self) -> "LoginRequest":
        if not self.username and not self.email:
            raise ValueError("username or email is required")
        return self


class GoogleAuthRequest(RequestSchema):
    code: NonEmptyStr


class RefreshVerificationRequest(RequestSchema):
    email: EmailValue | None = None
    username: UsernameValue | None = None

    _validate_email = field_validator("email")(validate_email)

    @model_validator(mode="after")
    def require_username_or_email(self) -> "RefreshVerificationRequest":
        if not self.email and not self.username:
            raise ValueError("username or email is required")
        return self


class ConfirmVerificationRequest(RequestSchema):
    username: UsernameValue
    code: str

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, value: str | int) -> str:
        code = str(value).strip()
        if not re.fullmatch(r"\d{6}", code):
            raise ValueError("verification code must be 6 digits")
        return code


class ProgramsQuery(RequestSchema):
    only_majors: bool = False


class IncludeCoursesQuery(RequestSchema):
    include_courses: bool = False


class ProgramUpdateRequest(RequestSchema):
    program_ids: list[int] = Field(alias="programIds", min_length=1, max_length=20)

    @field_validator("program_ids")
    @classmethod
    def validate_program_ids(cls, value: list[int]) -> list[int]:
        if any(program_id <= 0 for program_id in value):
            raise ValueError("program ids must be positive integers")
        if len(set(value)) != len(value):
            raise ValueError("program ids must be unique")
        return value


class SequenceUpdateRequest(RequestSchema):
    coop: bool
    started_term_id: int
    sequence_id: int | None = Field(default=None, gt=0)
    sequence_path: list[NonEmptyStr] | None = Field(
        default=None, min_length=1, max_length=20
    )

    _validate_started_term_id = field_validator("started_term_id")(
        validate_waterloo_term_id
    )

    @field_validator("sequence_path")
    @classmethod
    def validate_sequence_path(
        cls, value: list[NonEmptyStr] | None
    ) -> list[NonEmptyStr] | None:
        if value is None:
            return value
        invalid_terms = [term for term in value if not SEQUENCE_TERM_RE.fullmatch(term)]
        if invalid_terms:
            raise ValueError("sequence path contains invalid term labels")
        return value

    @model_validator(mode="after")
    def require_sequence(self) -> "SequenceUpdateRequest":
        if self.sequence_id is None and self.sequence_path is None:
            raise ValueError("sequence_id or sequence_path is required")
        return self


class UpdateUserInfoRequest(RequestSchema):
    username: UsernameValue
    email: EmailValue
    bio: str = Field(max_length=500)

    _validate_email = field_validator("email")(validate_email)


class CourseRequirementsRequest(RequestSchema):
    course_codes: list[CourseCodeValue] = Field(max_length=200)

    @field_validator("course_codes")
    @classmethod
    def validate_course_codes(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("course codes must be unique")
        return value


class UpdateTermsRequest(RequestSchema):
    term_id_1: int = Field(alias="termId1")
    term_id_2: int = Field(alias="termId2")

    _validate_term_id_1 = field_validator("term_id_1")(validate_waterloo_term_id)
    _validate_term_id_2 = field_validator("term_id_2")(validate_waterloo_term_id)


class TermRequest(RequestSchema):
    term_id: int

    _validate_term_id = field_validator("term_id")(validate_waterloo_term_id)


class DeleteCourseItem(RequestSchema):
    course_id: int = Field(alias="courseId", gt=0)
    term_id: int = Field(alias="termId")

    _validate_term_id = field_validator("term_id")(validate_waterloo_term_id)


class DeleteCourseRequest(RequestSchema):
    courses: list[DeleteCourseItem] = Field(min_length=1, max_length=50)
    current_term: int

    _validate_current_term = field_validator("current_term")(validate_waterloo_term_id)


class AddSingleSections(RequestSchema):
    course_id: int = Field(gt=0)
    class_numbers: list[int] = Field(min_length=1, max_length=20)

    @field_validator("class_numbers")
    @classmethod
    def validate_class_numbers(cls, value: list[int]) -> list[int]:
        if any(class_number <= 0 for class_number in value):
            raise ValueError("class numbers must be positive integers")
        if len(set(value)) != len(value):
            raise ValueError("class numbers must be unique")
        return value


class AddSingleCourses(RequestSchema):
    course_ids: list[int] | None = Field(default=None, min_length=1, max_length=20)
    sections: AddSingleSections | None = None

    @field_validator("course_ids")
    @classmethod
    def validate_course_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return value
        if any(course_id <= 0 for course_id in value):
            raise ValueError("course ids must be positive integers")
        if len(set(value)) != len(value):
            raise ValueError("course ids must be unique")
        return value

    @model_validator(mode="after")
    def require_course_ids_or_sections(self) -> "AddSingleCourses":
        if self.course_ids is None and self.sections is None:
            raise ValueError("course_ids or sections is required")
        if self.course_ids is not None and self.sections is not None:
            raise ValueError("provide only one of course_ids or sections")
        return self


class AddSingleRequest(RequestSchema):
    term_id: int
    courses: AddSingleCourses

    _validate_term_id = field_validator("term_id")(validate_waterloo_term_id)


class AddBatchRequest(RequestSchema):
    term_id: int
    html: Annotated[str, Field(min_length=1, max_length=500_000)]

    _validate_term_id = field_validator("term_id")(validate_waterloo_term_id)


class TestRequest(RequestSchema):
    error: str = ""
