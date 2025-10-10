from ..Schema import Major, Minor, Sequence, Specialization, Users, db


def enrol_to_majors(major_ids: set[int], username: str) -> tuple[int, str]:
    """Function to enrol a student in a major.

    Requires:
        - major_ids (set[int]):
            The ids of the majors
        - username (str):
            The student to add.

    Returns:
        the status of this + message.

    """
    # Getting the data
    user = Users.query.filter_by(username=username).first()
    if not user:
        return (403, "Username does not exist")

    majors = Major.query.filter(Major.id.in_(major_ids)).all()

    new_ids = {m.id for m in majors}
    old_ids = {m.id for m in user.majors}
    missing = [id for id in major_ids if id not in new_ids]
    if missing:
        return (400, f"the following ids does not exist: {missing}")

    removed = [m.name for m in user.majors if m.id not in new_ids]
    added = [m.name for m in majors if m not in old_ids]
    try:
        user.majors = majors
        db.session.add(user)
        db.session.commit()
        return (
            201,
            f"{user.username} is enroled in {added} and remvoed from {removed}",
        )
    except Exception as e:
        return (500, str(e))


def enrol_to_minors(minor_ids: set[int], username: str) -> tuple[int, str]:
    """Function to enrol a student in a minor.

    Requires:
        - minor_id (set[int]):
            The ids of the minors.
        - username (str):
            The username of the student to enrol.

    Returns:
        - The status code and the message.

    """
    # Getting the data
    user = Users.query.filter_by(username=username).first()
    if not user:
        return (403, "Username does not exist")

    minors = Minor.query.filter(Minor.id.in_(minor_ids)).all()

    new_ids = {m.id for m in minors}
    old_ids = {m.id for m in user.minors}
    missing = [id for id in minor_ids if id not in new_ids]
    if missing:
        return (400, f"the following ids does not exist: {missing}")

    removed = [m.name for m in user.minors if m.id not in new_ids]
    added = [m.name for m in minors if m not in old_ids]
    try:
        user.minors = minors
        db.session.add(user)
        db.session.commit()
        return (
            201,
            f"{user.username} is enroled in {added} and remvoed from {removed}",
        )
    except Exception as e:
        return (500, str(e))


def enrol_to_specs(spec_ids: set[int], username: str) -> tuple[int, str]:
    """Function to enrol a student in a specialization.

    Requires:
        - spec_id (set[int]):
            The ids of the specialization.
        - username (str):
            The username of the person we want to add.

    Returns:
        - The status + the message

    """
    # Getting the data
    user = Users.query.filter_by(username=username).first()
    if not user:
        return (403, "Username does not exist")

    specs = Specialization.query.filter(Specialization.id.in_(spec_ids)).all()

    new_ids = {m.id for m in specs}
    old_ids = {m.id for m in user.specializations}
    missing = [id for id in spec_ids if id not in new_ids]
    if missing:
        return (400, f"the following ids does not exist: {missing}")

    removed = [m.name for m in user.specializations if m.id not in new_ids]
    added = [m.name for m in specs if m not in old_ids]
    try:
        user.specializations = specs
        db.session.add(user)
        db.session.commit()
        return (
            201,
            f"{user.username} is enroled in {added} and remvoed from {removed}",
        )
    except Exception as e:
        return (500, str(e))


def enrol_to_seq(seq_id: str, username: str) -> tuple[int, str]:
    """Function to enrol a student in a specialization.

    Requires:
        - seq_id (number):
            The id of the sequence.

    Returns:
        the status and the message.

    """
    sequence = Sequence.query.filter_by(id=seq_id).first()
    user = Users.query.filter_by(username=username).first()
    if not sequence:
        return 401, "selected sequence does not exist"
    try:
        user.sequence = sequence
        user.path = sequence.plan
        db.session.add(user)
        db.session.commit()
        return 200, "Sequence Updated"
    except Exception as e:
        return 500, str(e)
