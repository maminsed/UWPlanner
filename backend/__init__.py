"""Setps up the Database and Flask Backend."""

import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from .Auth import auth_bp
from .Login_actions import update_info
from .Schema import db, migrate
from .School_info import school_info_bp
from .Test import test_bp
from .Courses import courses_bp

load_dotenv()


def create_app() -> Flask:
    """Setps up the Database and Flask Backend."""
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"postgresql://{os.getenv('PGUSER')}:{os.getenv('PGPASSWORD')}@{os.getenv('PGHOST')}/neondb?sslmode=require"
    )

    db.init_app(app)
    migrate.init_app(app, db)
    # with app.app_context():
    #     db.create_all() #Put this back with deployment

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(update_info, url_prefix="/update_info")
    app.register_blueprint(courses_bp, url_prefix="/courses")

    # get rid of
    app.register_blueprint(test_bp, url_prefix="/test")
    app.register_blueprint(school_info_bp, url_prefix="/school_info") #?

    CORS(
        app,
        origins=["http://localhost:3000"],
        supports_credentials=True,
    )
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, use_reloader=True)
