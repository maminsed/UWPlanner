from ..Schema import db
from ..Schema.db import Major, Users


def add_major(major_name: str, faculty: str, url: str) -> tuple[bool, str]:
    """Function to add a major. Not Completed!"""
    try:
        res = Major.query.filter_by(name=major_name).first()
        if res:
            major.faculty = faculty
            major.url = url
            db.session.add(major)
            db.session.commit()
            return (True, "Major Already Exists - Infomration updated")

        major = Major(name=major_name, faculty=faculty, url=url)
        db.session.add(major)
        db.session.commit()
        return (True, "Major Added with 0 users")
    except Exception as e:
        return (False, "Error in backend")



def enrol_to_major(major_name: str, username: str) -> tuple[bool, str]:
    """Function to enrol a student in a major. Not Completed!"""
    major = Major.query.filter_by(name=major_name).first()
    user = Users.query.filter_by(username=username).first()
    if not major or not user:
        return (False, "User or Major does not exist")

    user.major = major
    user.major_id = major.id
    db.session.add(user)
    db.session.commit()
    return (True, f"{user.username} is enroled in {major.name}")
