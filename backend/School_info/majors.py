from ..Schema import db
from ..Schema.db import Major, Users, Minor


def add_major(major_name: str, faculty: str, url: str) -> tuple[bool, str]:
    """Function to add a major. Not Completed!"""
    try:
        res = Major.query.filter_by(name=major_name).first()
        if res:
            res.faculty = faculty
            res.url = url
            db.session.add(res)
            db.session.commit()
            return (True, "Major Already Exists - Infomration updated")

        major = Major(name=major_name, faculty=faculty, url=url)
        db.session.add(major)
        db.session.commit()
        return (True, "Major Added with 0 users")
    except Exception as e:
        return (False, "Error in backend", str(e))


def add_minor(name: str, theme: str | None = None, url: str | None = None):
    try:
        exists = Minor.query.filter_by(name=name).first()
        if exists:
            if theme is not None:
                exists.theme = theme
            if exists is not None:
                exists.url = url
            db.session.add(exists)
            db.session.commit()
            return (True, "Updated Minor: " + name)

        theme = theme or ""
        url = url or ""
        minor = Minor(name=name, theme=theme, url=url)
        db.session.add(minor)
        db.session.commit()
        return (True, "Minor added: " + name)
    except Exception as e:
        return (False, "Errror in Backend", str(e))


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


def update_coop_info(major, coop=False, regular=True, minor=False):
    major.coop = coop
    major.regular = regular

    if minor:
        add_minor(major.name)
    db.session.add(major)
    db.session.commit()
    return True, "Majro updated"
