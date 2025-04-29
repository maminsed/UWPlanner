from flask import Flask
import os
from dotenv import load_dotenv
from flask_cors import CORS
from .Auth import auth_bp
from .Schema import db, migrate
load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    db.init_app(app)
    migrate.init_app(app, db)
    # with app.app_context():
    #     db.create_all() #Put this back with deployment


    app.register_blueprint(auth_bp, url_prefix="/auth")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, use_reloader=True)