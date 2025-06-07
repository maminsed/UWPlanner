from ..Schema import db
from ..Schema.db import Major, Users

def add_major(major_name:str)->tuple[bool, str]:
    res = Major.query.filter_by(name=major_name).first()
    print(res)
    if res:
        return (False,"Major Already Exists")
    
    major = Major(name=major_name)
    db.session.add(major)
    db.session.commit()
    return (True, "Major Added with 0 users")

def enrol_to_major(major_name:str, username:str)->tuple[bool, str]:
    major = Major.query.filter_by(name=major_name).first()
    user = Users.query.filter_by(username=username).first()
    if not major or not user:
        return (False, "User or Major does not exist")
    
    user.major = major
    user.major_id = major.id
    db.session.add(user)
    db.session.commit()
    return (True, f"{user.username} is enroled in {major.name}")
