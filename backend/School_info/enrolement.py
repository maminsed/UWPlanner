from ..Schema import Major, Users, db, Minor

def enrol_to_major(major_name: str, username: str) -> tuple[int, str]:
    """Function to enrol a student in a major. Not Complete"""
    major = Major.query.filter_by(name=major_name).first()
    user = Users.query.filter_by(username=username).first()
    if not major:
        return (403, "Major does not exist")
    if not user:
        return (403, "Username does not exist")

    try:
        if major in user.majors:
            return (202, f"{user.username} is already in {major.name}")
        user.majors.append(major)
        db.session.add(user)
        db.session.commit()
        return (201, f"{user.username} is enroled in {major.name}")
    except Exception as e:
        return (500, str(e))

def enrol_to_minor(minor_name: str, username: str) -> tuple[int, str]:
    minor = Minor.query.filter_by(name=minor_name).first()
    user = Users.query.filter_by(username=username).first()
    if not minor:
        return (403, "Major does not exist")
    if not user:
        return (403, "Username does not exist")
    
    try:
        if minor in user.minors:
            return (202, f"{user.username} is already in {minor.name}")
        user.minors.append(minor)
        db.session.add(user)
        db.session.commit()
        return (201, f"{user.username} is enroled in {minor.name}")
    except Exception as e:
        return (500, str(e))
