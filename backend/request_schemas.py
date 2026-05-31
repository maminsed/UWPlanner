# ruff: noqa: D101,D102

from typing import Annotated, TypeVar

from flask import jsonify, request
from flask.typing import ResponseReturnValue
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

NonEmptyStr = Annotated[str, Field(min_length=1)]
TRequestSchema = TypeVar("TRequestSchema", bound="RequestSchema")


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
    email: NonEmptyStr
    password: NonEmptyStr


class LoginRequest(RequestSchema):
    password: NonEmptyStr
    username: NonEmptyStr | None = None
    email: NonEmptyStr | None = None

    @model_validator(mode="after")
    def require_username_or_email(self) -> "LoginRequest":
        if not self.username and not self.email:
            raise ValueError("username or email is required")
        return self


class GoogleAuthRequest(RequestSchema):
    code: NonEmptyStr


class RefreshVerificationRequest(RequestSchema):
    email: NonEmptyStr | None = None
    username: NonEmptyStr | None = None

    @model_validator(mode="after")
    def require_username_or_email(self) -> "RefreshVerificationRequest":
        if not self.email and not self.username:
            raise ValueError("username or email is required")
        return self


class ConfirmVerificationRequest(RequestSchema):
    username: NonEmptyStr
    code: NonEmptyStr | int


class ProgramsQuery(RequestSchema):
    only_majors: bool = False


class IncludeCoursesQuery(RequestSchema):
    include_courses: bool = False


class ProgramUpdateRequest(RequestSchema):
    program_ids: list[int] = Field(alias="programIds", min_length=1)


class SequenceUpdateRequest(RequestSchema):
    coop: bool
    started_term_id: int = Field(gt=0)
    sequence_id: int | None = Field(default=None, gt=0)
    sequence_path: list[NonEmptyStr] | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def require_sequence(self) -> "SequenceUpdateRequest":
        if self.sequence_id is None and self.sequence_path is None:
            raise ValueError("sequence_id or sequence_path is required")
        return self


class UpdateUserInfoRequest(RequestSchema):
    username: NonEmptyStr
    email: NonEmptyStr
    bio: str


class CourseRequirementsRequest(RequestSchema):
    course_codes: list[str]


class UpdateTermsRequest(RequestSchema):
    term_id_1: int = Field(alias="termId1", gt=0)
    term_id_2: int = Field(alias="termId2", gt=0)


class TermRequest(RequestSchema):
    term_id: int = Field(gt=0)


class DeleteCourseItem(RequestSchema):
    course_id: int = Field(alias="courseId", gt=0)
    term_id: int = Field(alias="termId", gt=0)


class DeleteCourseRequest(RequestSchema):
    courses: list[DeleteCourseItem] = Field(min_length=1)
    current_term: int = Field(gt=0)


class AddSingleSections(RequestSchema):
    course_id: int = Field(gt=0)
    class_numbers: list[int] = Field(min_length=1)


class AddSingleCourses(RequestSchema):
    course_ids: list[int] | None = Field(default=None, min_length=1)
    sections: AddSingleSections | None = None

    @model_validator(mode="after")
    def require_course_ids_or_sections(self) -> "AddSingleCourses":
        if self.course_ids is None and self.sections is None:
            raise ValueError("course_ids or sections is required")
        if self.course_ids is not None and self.sections is not None:
            raise ValueError("provide only one of course_ids or sections")
        return self


class AddSingleRequest(RequestSchema):
    term_id: int = Field(gt=0)
    courses: AddSingleCourses


class AddBatchRequest(RequestSchema):
    term_id: int = Field(gt=0)
    html: NonEmptyStr


class TestRequest(RequestSchema):
    error: str = ""
