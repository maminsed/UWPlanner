from ..Schema import Major, Minor, Sequence, Specialization, Users, db


def enrol_to_major(major_id: str, username: str) -> tuple[int, str]:
    """Function to enrol a student in a major.

    Requires:
        - major_name (str):
            The name of the major
        - username (str):
            The student to add.

    Returns:
        the status of this + message.

    """
    # Getting the data
    major = Major.query.filter_by(id=major_id).first()
    user = Users.query.filter_by(username=username).first()
    if not major:
        return (403, "Major does not exist")
    if not user:
        return (403, "Username does not exist")

    try:
        # If it's already in there just retuning it, and if not adding it.
        if major in user.majors:
            return (202, f"{user.username} is already in {major.name}")
        user.majors.append(major)
        db.session.add(user)
        db.session.commit()
        return (201, f"{user.username} is enroled in {major.name}")
    except Exception as e:
        return (500, str(e))


def enrol_to_minor(minor_id: str, username: str) -> tuple[int, str]:
    """Function to enrol a student in a minor.

    Requires:
        - minor_id (str):
            The id of the minor.
        - username (str):
            The username of the student to enrol.

    Returns:
        - The status code and the message.

    """
    # Getting the data
    minor = Minor.query.filter_by(id=minor_id).first()
    user = Users.query.filter_by(username=username).first()
    if not minor:
        return (403, "Minor does not exist")
    if not user:
        return (403, "Username does not exist")

    # Adding to database plus a few error checking.
    try:
        if minor in user.majors:
            return (403, "Can't choose your major as your minor.")
        if minor in user.minors:
            return (202, f"{user.username} is already in {minor.name}")
        user.minors.append(minor)
        db.session.add(user)
        db.session.commit()
        return (201, f"{user.username} is enroled in {minor.name}")
    except Exception as e:
        return (500, str(e))


def enrol_to_spec(spec_id: str, username: str) -> tuple[int, str]:
    """Function to enrol a student in a specialization.

    Requires:
        - spec_id (str):
            The id of the specialization.
        - username (str):
            The username of the person we want to add.

    Returns:
        - The status + the message

    """
    # Getting the data
    spec = Specialization.query.filter_by(id=spec_id).first()
    user = Users.query.filter_by(username=username).first()
    if not spec:
        return (403, "Specializations does not exist")
    if not user:
        return (403, "Username does not exist")

    # Adding the data to database
    try:
        if spec in user.specialization:
            return (202, f"{user.username} is already in {spec.name}")
        user.specialization.append(spec)
        db.session.add(user)
        db.session.commit()
        return (201, f"{user.username} is enroled in {spec.name}")
    except Exception as e:
        return (500, str(e))


def enrol_to_seq(seq_id: str, username: str) -> tuple[int, str]:
    """Function to enrol a student in a specialization.

    Requires:
        - seq_name (str):
            The name of the sequence, prone to change.
    Returns:
        the status and the message.
    """
    sequence = Sequence.query.filter_by(id=seq_id).first()
    user = Users.query.filter_by(username=username).first()
    if not sequence:
        return 401, "selected sequence does not exist"
    try:
        user.sequence = sequence
        db.session.add(user)
        db.session.commit()
        return 200, "Sequence Updated"
    except Exception as e:
        return 500, str(e)
