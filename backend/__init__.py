from flask import Flask
import os
from dotenv import load_dotenv
from flask_cors import CORS
from .Auth import auth_bp
from .Schema import db
load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    db.init_app(app)
    with app.app_context():
        db.create_all()

    app.register_blueprint(auth_bp, url_prefix="/auth")

    return app
