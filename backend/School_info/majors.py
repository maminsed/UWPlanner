from ..Schema import db
from ..Schema.db import Major, Minor, Users, Specialization


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
            #If it exists updating it and sending back a resopnse. 
            res.faculty = faculty
            res.url = url
            db.session.add(res)
            db.session.commit()
            return (True, "Major Already Exists - Information updated")

        #If it doesn't exist create a major with 0 students enroled.
        major = Major(name=major_name, faculty=faculty, url=url)
        db.session.add(major)
        db.session.commit()
        return (True, "Major Added with 0 users")
    except Exception as e:
        return (False, "Error in backend", str(e))


def add_minor(name: str, theme: str | None = None, url: str | None = None) -> tuple[bool, str]:
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
        #Check if the minor exists
        exists = Minor.query.filter_by(name=name).first()
        if exists:
            #If it exists updating accordingly and sending back the response. 
            if theme is not None:
                exists.theme = theme
            if exists is not None:
                exists.url = url
            db.session.add(exists)
            db.session.commit()
            return (True, "Updated Minor: " + name)

        #Giving default values in case of ""
        theme = theme or ""
        url = url or ""
        #Creating minor and returning the response.
        minor = Minor(name=name, theme=theme, url=url)
        db.session.add(minor)
        db.session.commit()
        return (True, "Minor added: " + name)
    except Exception as e:
        return (False, "Error in Backend", str(e))


def enrol_to_major(major_name: str, username: str) -> tuple[bool, str]:
    """Function to enrol a student in a major. Not Completed."""
    major = Major.query.filter_by(name=major_name).first()
    user = Users.query.filter_by(username=username).first()
    if not major or not user:
        return (False, "User or Major does not exist")

    user.major = major
    user.major_id = major.id
    db.session.add(user)
    db.session.commit()
    return (True, f"{user.username} is enroled in {major.name}")


def update_coop_info(major:str, coop:bool=False, regular:bool=True, minor:bool=False) -> tuple[bool, str]:
    """Function to add whether a major has a coop a regular or is enrolable as a minor."""
    major.coop = coop
    major.regular = regular

    #If it does have a minor, creating it and returning back the response.
    if minor:
        add_minor(major.name)
    db.session.add(major)
    db.session.commit()
    return True, "Major updated"

def add_specialization(name:str, link:str, field:str)->tuple[bool,str]:
    res = Specialization.query.filter_by(name=name, field=field).first()

    if res:
        if res.link != link:
            res.link = link
            db.session.add(res)
            db.session.commit()
        return True,"Specialization already existed!"
    
    s = Specialization(name = name, link=link, field=field)
    db.session.add(s)
    db.session.commit()
    add_relation_res = add_relation(s,field)
    return add_relation_res[0],add_relation_res[1] + " " + "Specialization Created"
    
    
def add_relation(specialization:Specialization, field:str)->tuple[bool,str]:
    """Finds the major for the specialization with the field."""
    major =  Major.query.filter_by(name=field).first()
    if not major:
        return False,f"{field} is not a major"
    
    specialization.major = major
    db.session.add(specialization)
    db.session.commit()
    return True,"Connection created"

def add_option(name:str, link:str, field:str):
    """Function to add Options to the database. """
    res = Specialization.query.filter_by(name=name, field=field, is_option=True).first()
    if res:
        res.link = link
        db.session.add(res)
        db.session.commit()
        return True,f"{name} already existed"

    option = Specialization(name=name, field=field, is_option=True, link=link)
    db.session.add(option)
    db.session.commit()
    return True,f"{name}-Option added"
