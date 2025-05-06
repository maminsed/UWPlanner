from db import Users, db, app
from datetime import datetime

if __name__ == "__main__": 
    with app.app_context():
        u = Users(user_name="fat", pass_hash="obesityNig", login_method=12, created_at=datetime.now(), last_updated_at=datetime.now())
        db.session.add(u)
        db.session.commit()