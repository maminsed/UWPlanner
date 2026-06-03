"""Setps up the Database and Flask Backend."""

import os
from uuid import uuid4

from dotenv import load_dotenv
from flask import Flask, Response, g, request
from flask_cors import CORS

from .Auth import auth_bp
from .config import get_database_uri, get_frontend_origins, validate_required_config
from .Courses import courses_bp
from .Login_actions import update_info
from .Schema import db, migrate

load_dotenv()


def create_app() -> Flask:
    """Setps up the Database and Flask Backend."""
    validate_required_config()

    app = Flask(__name__)

    frontend_origins = get_frontend_origins()
    app.config["FRONTEND_ORIGINS"] = frontend_origins
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", "524288"))
    app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri()

    @app.before_request
    def add_request_id() -> None:
        g.request_id = request.headers.get("X-Request-ID") or uuid4().hex

    @app.after_request
    def attach_request_id(response: Response) -> Response:
        response.headers["X-Request-ID"] = g.request_id
        return response

    db.init_app(app)
    migrate.init_app(app, db)
    # with app.app_context():
    #     db.create_all() #Put this back with deployment

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(update_info, url_prefix="/update_info")
    app.register_blueprint(courses_bp, url_prefix="/courses")

    CORS(
        app,
        origins=frontend_origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, use_reloader=True)
