import json
from ..Schema import db
from ..Schema.db import Major, Minor, Sequence, Specialization


def add_major(major_name: str, faculty: str, url: str) -> tuple[bool, str]:
    """Function to add a major. If the major already exists, it updates it.

    Requires:
        - major_name (str):
            The name of the major.
        - faculty (str):
            The faculty it belongs to.
        - url (str):
            This one is any url that gives information about the major.

    Returns:
        Information about what happened.

    """
    try:
        # Checking if the major exists
        res = Major.query.filter_by(name=major_name).first()
        if res:
            # If it exists updating it and sending back a resopnse.
            res.faculty = faculty
            res.url = url
            db.session.add(res)
            db.session.commit()
            return (True, "Major Already Exists - Information updated")

        # If it doesn't exist create a major with 0 students enroled.
        major = Major(name=major_name, faculty=faculty, url=url)
        db.session.add(major)
        db.session.commit()
        return (True, "Major Added with 0 users")
    except Exception as e:
        return (False, "Error in backend", str(e))


def add_minor(
    name: str, theme: str | None = None, url: str | None = None
) -> tuple[bool, str]:
    """Function to add a minor. If the minor already exists, it updates it.

    Requires:
        - name (str):
            The name of the minor.
        - theme (Optional[str]):
            The theme it belongs to.
            For more information check the uwaterloo official minor page.
            Defaults None.
        - url (Optional[str]):
            This one is any url that gives information about the minor.
            Defaults None.

    Returns:
        Information about what happened.

    """
    try:
        # Check if the minor exists
        exists = Minor.query.filter_by(name=name).first()
        if exists:
            # If it exists updating accordingly and sending back the response.
            if theme is not None:
                exists.theme = theme
            if exists is not None:
                exists.url = url
            db.session.add(exists)
            db.session.commit()
            return (True, "Updated Minor: " + name)

        # Giving default values in case of ""
        theme = theme or ""
        url = url or ""
        # Creating minor and returning the response.
        minor = Minor(name=name, theme=theme, url=url)
        db.session.add(minor)
        db.session.commit()
        return (True, "Minor added: " + name)
    except Exception as e:
        return (False, "Error in Backend", str(e))


def update_coop_info(
    major: str, coop: bool = False, regular: bool = True, minor: bool = False
) -> tuple[bool, str]:
    """Function to add whether a major has a coop a regular or is enrolable as a minor.

    Requires:
        - major (str):
            the major you want to update.
        - coop (bool):
            whether it has a coop or not.
        - regular (bool):
            whether it has regular option or not.
        - minor (bool):
            whether it has a minor or not.

    Returns:
        The Success status. For now there is no failure unless it crashes.

    """
    major.coop = coop
    major.regular = regular

    # If it does have a minor, creating it and returning back the response.
    if minor:
        add_minor(major.name)
    db.session.add(major)
    db.session.commit()
    return True, "Major updated"


def add_specialization(name: str, link: str, field: str) -> tuple[bool, str]:
    """Function to add a specialization.

    Requires:
        - name (str):
            The name of the specialization.
        - link (str):
            The link to the undergrad page.
        - field (str):
            The field the specializations belongs to (e.g. major I think so).

    Returns:
        - The response status of the event and the message.

    """
    res = Specialization.query.filter_by(name=name, field=field).first()

    if res:
        if res.link != link:
            res.link = link
            db.session.add(res)
            db.session.commit()
        return True, "Specialization already existed!"

    s = Specialization(name=name, link=link, field=field)
    db.session.add(s)
    db.session.commit()
    return True, "Specialization Created"


def add_option(name: str, link: str, field: str) -> tuple[bool, str]:
    """Function to add Options to the database.

    Requires:
        - name (str):
            the name of the option
        - link (str):
            The link to the page.
        - field (str):
            The field the option belongs to.

    Returns:
        The status and the message of the response.

    """
    res = Specialization.query.filter_by(name=name, field=field, is_option=True).first()
    if res:
        res.link = link
        db.session.add(res)
        db.session.commit()
        return True, f"{name} already existed"

    option = Specialization(name=name, field=field, is_option=True, link=link)
    db.session.add(option)
    db.session.commit()
    return True, f"{name}-Option added"


def update_sequence() -> list[str]:
    """Update eng sequence names."""
    seqs = Sequence.query.all()
    updated = []
    for s in seqs:
        if "engineering" in s.name.lower():
            plan = s.plan.lower().split("-")
            changed = False
            if plan[1] == "coop":
                s.name = "Stream_4_Eng"
                updated.append(s.id)
                changed = True
            elif plan[1] == "study" and plan[2] == "coop":
                s.name = "Stream_8_Eng"
                updated.append(s.id)
                changed = True

            if changed:
                db.session.add(s)
                db.session.flush()
    db.session.commit()
    return updated
