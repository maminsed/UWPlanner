import json
from collections import defaultdict
from typing import Optional

from flask import Blueprint, g, jsonify, make_response, request

from backend.Auth import verify as verify_jwt
from backend.Auth.auth import add_tokens
from backend.Auth.send_mail import send_verification_mail
from backend.Schema import (
    Course,
    Programs,
    Semester,
    Sequence,
    Users,
    db,
)
from backend.utils.path import term_distance, translate_path, translate_to_id

update_info = Blueprint("UpdateInfo", __name__)


@update_info.before_request
def verify() -> Optional[make_response]:
    return verify_jwt()


"""
Endpoints
GET Endpoints: 
    (school information)
    - majors -> ProgramReturn
    - programs -> ProgramReturn
    - sequences -> SequenceReturn
    (student information)
    - user_info -> {
        username: str;
        bio: str;
        email: str;
    }
    - user_seqs: include_courses (if false, course_ids is empty) -> {
        coop: boolean;
        path: {"name":'1A'|...,"course_ids":int[]}[];
        sequence_name: str;
        started_term_id: number;
    }
    #About to go out
    - get_user_seq -> {
        current_sem: number,
        started_term_id: number,
        sequence: str,
        started_year: number,
        started_sem: str,
        coop: boolean,
        path: str[],
    }
    (course information)
    - get_course_reqs (POST)

UPDATE (POST) Endpoints:
    - programs: {"programIds": number[]}
    - sequences: {
        coop: boolean;
        sequence_id?: number || sequence_path: str[]
        started_term_id: number;
    }
    - update_user_info : {
        username: str,
        bio: str,
        email: str,
    }
    - update_terms: endpoint to swap terms

Return types:
ProgramReturn: {
    enroledIds: {
        id: number;
        name: str;  
        groupName: str;  
        programType: str;
    }[]
    availablePrograms: {
        groupName: str;
        programs: {
            id: number;
            name: str;
            programType: str; 
        }[]
    }[]
}

SequenceReturn : {
    "legend": dict[str,str],
    "seqGroups": {
        "programName": str,
        "sequences": {
            "id": number,
            "name": str,
            "appliesTo": str,
            "plan": str[]
        }[] 
    }[]
}[]
"""

onlyMajorProgramTypes = [
    "certificate",
    "diploma",
    "doctorate",
    "double degree",
    "joint major",
    "major",
]


@update_info.route("/programs", methods=["GET"])
def get_programs():
    only_majors: bool = request.args.get("only_majors") or False
    user_programs: list[Programs] = (
        Users.query.filter_by(username=g.username).first().programs
    )
    if not only_majors:
        programs: list[Programs] = Programs.query.filter(
            Programs.programType.in_(
                onlyMajorProgramTypes + ["minor", "specialization", "option"]
            )
        ).all()
        enroled_ids = [
            {
                "id": p.id,
                "name": p.name,
                "groupName": p.groupName,
                "programType": p.programType,
            }
            for p in user_programs
        ]
    else:
        programs: list[Programs] = Programs.query.filter(
            Programs.programType.in_(onlyMajorProgramTypes)
        ).all()
        enroled_ids = [
            {
                "id": p.id,
                "name": p.name,
                "groupName": p.groupName,
                "programType": p.programType,
            }
            for p in user_programs
            if p.programType in onlyMajorProgramTypes
        ]
    counter: dict[str, list] = {}
    for p in programs:
        if p.groupName not in counter:
            counter[p.groupName] = []
        counter[p.groupName].append(
            {"id": p.id, "name": p.name, "programType": p.programType}
        )
    available_programs = [{"groupName": k, "programs": v} for k, v in counter.items()]
    return jsonify(
        {"availablePrograms": available_programs, "enroledIds": enroled_ids}
    ), 200


@update_info.route("/programs", methods=["POST"])
def update_programs():
    only_majors: bool = request.args.get("only_majors") or False
    data = request.get_json()
    program_ids = data.get("programIds")
    user = Users.query.filter_by(username=g.username).first()
    if not user or not program_ids:
        return jsonify({"message": "at least have on program_id"}), 400
    msg, status_code = update_programs_in_db(user, program_ids, only_majors)
    return msg, status_code


def update_programs_in_db(user: Users, program_ids: list[int], only_majors: bool):
    programs = Programs.query.filter(Programs.id.in_(program_ids)).all()
    if len(programs) != len(program_ids):
        return jsonify({"message": "There might be a duplicate in programs"}), 404
    if only_majors:
        programs += [
            p for p in user.programs if p.programType not in onlyMajorProgramTypes
        ]
    user.programs = programs
    db.session.add(user)
    db.session.commit()
    return "", 204


@update_info.route("/sequences", methods=["GET"])
def get_sequence():
    username: str = g.username

    try:
        user: Users = Users.query.filter_by(username=username).first()
        majors = [
            p
            for p in user.programs
            if "major" in p.programType or "double degree" == p.programType
        ]
        degree_ids = {m.degreeId for m in majors}
        if not majors:
            return jsonify({"You need to have a major or degree first"}), 403
        degrees: list[Programs] = Programs.query.filter(
            Programs.id.in_(degree_ids)
        ).all()
        degrees = majors + degrees
        res = defaultdict(lambda: defaultdict(list))

        for p in degrees:
            for seq in p.sequences:
                res[seq.legend][p.name].append(
                    {
                        "id": seq.id,
                        "name": seq.name,
                        "appliesTo": seq.appliesTo,
                        "plan": translate_path(seq.plan),
                    }
                )
        default = Sequence.query.filter_by(name="Default").first()
        res[default.legend]["default"].append(
            {
                "id": default.id,
                "name": default.name,
                "appliesTo": default.appliesTo,
                "plan": translate_path(default.plan),
            }
        )
        return jsonify(
            [
                {
                    "legend": json.loads(legend),
                    "seqGroups": [
                        {"programName": programName, "sequences": sequences}
                        for programName, sequences in seqGroups.items()
                    ],
                }
                for legend, seqGroups in res.items()
            ]
        ), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "there was an error in backend"}), 500


@update_info.route("/sequences", methods=["POST"])
def update_sequences() -> tuple[str, int]:
    required_keys = "coop", "started_term_id"
    data: dict[str,] = request.get_json()
    user: Users = Users.query.filter_by(username=g.username).first()
    if not user:
        return jsonify({"message": "user does not exist"}), 400
    for k in required_keys:
        if k not in data or data[k] is None:
            return jsonify({"message": "fill out all the information first"}), 400
    if "sequence_id" not in data and "sequence_path" not in data:
        return jsonify({"message": "fill out all the information first"}), 400
    # updating coop
    user.coop = data.get("coop")
    user.started_term = data.get("started_term_id")
    # updating sequence
    sequence_id = data.get("sequence_id", None)
    sequence_path = data.get("sequence_path", None)
    sequence_path = json.dumps(sequence_path) if sequence_path is not None else None
    if sequence_id is not None:
        if user.sequence and user.sequence.id == sequence_id:
            seq_obj = user.sequence
        else:
            seq_obj: Sequence = Sequence.query.filter_by(id=sequence_id).first()
        if not seq_obj:
            return jsonify({"message": "sequence does not exist"}), 400
        user.sequence = seq_obj
        if sequence_path is None:
            sequence_path = seq_obj.plan
    if sequence_path is not None and sequence_path != user.path:
        user.path = sequence_path
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "change successfull"}), 200


@update_info.route("/user_info", methods=["GET"])
def get_all() -> tuple[str, int]:
    user: Users = Users.query.filter_by(username=g.username).first()
    return jsonify(
        {
            "username": user.username,
            "email": user.email,
            "bio": user.bio,
        }
    ), 200


@update_info.route("/user_seqs", methods=["GET"])
def get_user_seqs() -> tuple[str, int]:
    include_courses = request.args.get("include_courses", False) == True
    user: Users = Users.query.filter_by(username=g.username).first()
    path = [{"name": term, "course_ids": []} for term in translate_path(user.path)]
    if include_courses:
        user_semesters = {sem.id: json.loads(sem.courses) for sem in user.semesters}
        for i in range(len(path)):
            path[i]["course_ids"] = user_semesters.get(user.started_term + i, [])
    return {
        "coop": user.coop,
        "sequence_name": user.sequence.name,
        "started_term_id": user.started_term,
        "path": path,
    }


@update_info.route("/update_user_info", methods=["POST"])
def update_user_info():
    # TODO: add a failsafe for when they accidently add the wrong email
    data: dict[str, str] = request.get_json()
    user: Users = Users.query.filter_by(username=g.username).first()

    user.bio = data.get("bio", "")
    db.session.add(user)
    new_username = data.get("username", "")
    username_updated = False
    if user.username != new_username:
        existing_user = Users.query.filter_by(username=new_username).first()
        if existing_user:
            db.session.commit()
            return jsonify({"message": "user with this username already exists"}), 403
        user.username = new_username
        username_updated = True
        db.session.add(user)

    new_email = data.get("email", "")
    if user.email != new_email:
        existing_user = Users.query.filter_by(email=new_email).first()
        if existing_user:
            db.session.commit()
            return jsonify({"message": "user with this email already exists"}), 403
        user.email = new_email
        user.is_verified = False
        db.session.add(user)
        db.session.commit()
        send_verification_mail(user)
    db.session.add(user)
    db.session.commit()
    if username_updated:
        return add_tokens("user updated", 200, user)
    return jsonify({"message": "user updated"}), 200


"""
@update_info.route("/majors", methods=["GET"])
def get_majors() -> tuple[str, int]:
    " ""Endpoint to get all the majors grouped by their faculty." ""
    try:
        majors = Major.query.all()
        res = defaultdict(list)
        for m in majors:
            res[m.faculty].append([m.name, m.name, m.id])
        return jsonify({"data": [[f, res[f]] for f in res.keys()]}), 200
    except Exception as e:
        return jsonify({"message": "error in Backend", "error": str(e)}), 500


def add_field(
    func: Callable[[set[int], str], tuple[str, int]], threshold: int
) -> tuple[str, int]:
    "" "Function to add fields for a sepcific one of majors, minors, specializations" ""
    username = g.username
    values = getattr(g, "selected", [])
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if len(values) < threshold:
        return jsonify({"message": "The amount selected is less than required"}), 400

    # Checking for duplicates:
    visited = set()
    for v in values:
        if not v:
            return jsonify({"message": "You have empty values."}), 400
        if v[2] in visited:
            return jsonify({"message": "You have duplicate values."}), 400
        visited.add(v[2])

    status, message = func(visited, username)
    print(message)
    if status == 500:
        return jsonify({"message": "error in backend", "error": message}), status
    if status >= 400 and status <= 500:
        return jsonify({"message": message}), status
    return jsonify({"message": "user enroled!"}), 200


@update_info.route("/majors", methods=["POST"])
def add_majors() -> tuple[str, int]:
    " ""Endpoint that takes in the user and adds the users choices to it." ""
    data = request.get_json()
    majors = data.get("selected")
    g.selected = majors
    return add_field(enrol_to_majors, 1)


@update_info.route("/minors", methods=["GET"])
def get_minors() -> tuple[str, int]:
    try:
        minors = Minor.query.all()
        res = defaultdict(list)
        for m in minors:
            res[m.theme].append([m.name, m.name, m.id])
        return jsonify({"data": [[f, res[f]] for f in res.keys()]}), 200
    except Exception as e:
        return jsonify({"message": "error in backend", "error": str(e)}), 500


@update_info.route("/minors", methods=["POST"])
def add_minors() -> tuple[str, int]:
    data = request.get_json()
    minors = data.get("selected")
    g.selected = minors
    return add_field(enrol_to_minors, 0)


@update_info.route("/specializations", methods=["GET"])
def get_specializations() -> tuple[str, int]:
    try:
        ss = Specialization.query.all()
        username = g.username
        user = Users.query.filter_by(username=username).first()
        majors = []
        if user:
            majors = [m.name for m in user.majors] or []
        res = defaultdict(list)
        for s in ss:
            res[s.field].append([s.name, s.name, s.id])
        laterData = []
        data = []
        for field in res.keys():
            if field in majors:
                data.append([field, res[field]])
            else:
                laterData.append([field, res[field]])
        return jsonify({"data": data + laterData}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "error in backend", "error": str(e)}), 500


@update_info.route("/specializations", methods=["POST"])
def add_specializations() -> tuple[str, int]:
    data = request.get_json()
    ss = data.get("selected")
    g.selected = ss
    return add_field(enrol_to_specs, 0)


@update_info.route("/coop", methods=["GET"])
def get_coop() -> tuple[str, int]:
    return jsonify({"data": [["_", [["yes", "yes", 1], ["no", "no", 2]]]]}), 200


@update_info.route("/coop", methods=["POST"])
def add_coop() -> tuple[str, int]:
    username = g.username
    data = request.get_json()
    coop = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not coop or len(coop) != 1 or coop[0][0] not in ["yes", "no"]:
        return jsonify({"message": "Please select an option"}), 400
    try:
        user = Users.query.filter_by(username=username).first()
        user.coop = True if coop[0][0] == "yes" else False
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "coop option set"}), 204
    except Exception as e:
        print(e)
        return jsonify({"message": "error in backend", "error": str(e)}), 500



@update_info.route("/sequence", methods=["GET"])
def get_sequence():
    username = g.username

    if not username:
        return jsonify({"please sign in first"})
    try:
        user = Users.query.filter_by(username=username).first()
        if not user.majors:
            return jsonify({"You need to have a major first"}), 403
        res = {}
        default = Sequence.query.filter_by(name="Default").first()
        res[default.id] = ["Default", default.plan, default.id]

        # id: name, plan, id
        if user.coop:
            for m in user.majors:
                for seq in m.sequences:
                    if seq.id not in res:
                        res[seq.id] = (seq.name, "-".join(json.loads(seq.plan)), seq.id)
        return jsonify({"data": [["_", list(res.values())]]})
    except Exception as e:
        print(e)
        return jsonify(
            {"message": "sign in and come back to this again", "error": str(e)}
        ), 400

@update_info.route("/sequence", methods=["POST"])
def add_sequence() -> tuple[str, int]:
    username = g.username
    seq = (request.get_json()).get("selected")
    if not seq or len(seq) == 0:
        return jsonify({"message": "please select an option first"}), 401
    if not username:
        return jsonify({"message": "please log in first"}), 403
    status, message = enrol_to_seq(seq[0][2], username)
    if status == 500:
        return jsonify({"message": "error in backend", "error": message}), 500
    return jsonify({"message": message}), status

@update_info.route("/update_all", methods=["POST"])
def update_all() -> tuple[str, int]:
    required_keys = {
        "username",
        "email",
        "bio",
        "links",
        "majors",
        "minors",
        "specializations",
    }
    data = request.get_json()
    user = Users.query.filter_by(username=g.username).first()
    if not user:
        return jsonify({"message": "user does not exist"}), 400
    for k in required_keys:
        if k not in data:
            return jsonify({"message": f"key {k} not in data!"}), 400
    # updating user bio
    user.bio = data.get("bio")

    # updating user links
    newLink = data.get("links")
    oldLink = {l.url for l in user.links}
    added = [l for l in newLink if l not in oldLink]
    existed = [l for l in user.links if l.url in newLink]

    for url in added:
        link = Link(url=url, user=user)
        existed.append(link)
        db.session.add(link)
        db.session.flush()
    user.links = existed
    # comming the changes for now
    db.session.add(user)
    db.session.commit()

    # changing major - minor - specs
    dic = {
        "majors": [enrol_to_majors, 1],
        "minors": [enrol_to_minors, 0],
        "specializations": [enrol_to_specs, 0],
    }
    for key in dic:
        g.selected = data.get(key)
        message, status = add_field(dic[key][0], dic[key][1])
        if status >= 400 or status < 200:
            return message, status

    # chaning email
    newMail = data.get("email")
    if newMail != user.email:
        user.email = newMail
        user.is_verified = False
        db.session.add(user)
        db.session.commit()
        send_verification_mail(user)

    # changind username
    newUserName = data.get("username")
    if user.username != newUserName:
        existing = Users.query.filter_by(username=newUserName).first()
        if existing:
            return jsonify({"message": "user with that username already exists"}), 400
        user.username = newUserName
        db.session.add(user)
        db.session.flush()
        return add_tokens("change successfull", 200, user)

    return jsonify({"message": "change successfull"}), 200
"""


@update_info.route("/get_course_reqs", methods=["POST"])
def get_course_reqs() -> tuple[str, int]:
    data = request.get_json()
    course_codes: list[int] = data.get("course_codes") or []
    print(course_codes)
    db_courses = Course.query.filter(Course.code.in_(course_codes)).all()
    res = {}
    for course in db_courses:
        url = course.url or ""
        try:
            courseInfo = json.loads(course.courseInfo) if course.courseInfo else {}
        except:
            print("error in loading courseInfo")
            courseInfo = {}
        res[course.code] = {"url": url, "courseInfo": courseInfo}
    return jsonify({"courses": res}), 200


@update_info.route("/get_user_seq", methods=["GET"])
def get_user_seq() -> tuple[str, int]:
    include_courses: bool = request.args.get("include_courses") or False
    user = Users.query.filter_by(username=g.username).first()
    path = translate_path(user.path)
    if include_courses == "true":
        term_ids = translate_to_id(user.path, user.started_term)
        semesters = user.semesters
        for index, term in enumerate(term_ids):
            exists = [s for s in semesters if s.term_id == term]
            path[index] = (
                path[index],
                json.loads(exists[0].courses) if len(exists) != 0 else [],
            )
    sem_dic = {5: "Summer", 9: "Fall", 1: "Winter"}
    return jsonify(
        {
            "current_sem": user.current_term,
            "started_term_id": user.started_term,
            "sequence": user.sequence.name,
            "started_year": user.started_term // 10 + 1900,
            "started_sem": sem_dic[user.started_term % 10],
            "coop": user.coop,
            "path": path,
        }
    ), 200


@update_info.route("/update_terms", methods=["POST"])
def update_terms():
    """Endpoint to swap courses between two terms/semesters."""
    # Get the term IDs from the request
    data = request.get_json()
    termId1: int = data.get("termId1")
    termId2: int = data.get("termId2")

    # Fetch the user from the database
    user = Users.query.filter_by(username=g.username).first()

    # Validate that all required data is present
    if not termId1 or not termId2 or not user or not user.path:
        return jsonify({"message": "some of the arguments were not supplied"}), 403

    # Find existing semester records for both terms
    term1 = None
    term2 = None
    for term in user.semesters:
        if term.term_id == termId1:
            term1 = term
        elif term.term_id == termId2:
            term2 = term

    # Parse the user's path and calculate term indices
    path = json.loads(user.path)
    started_term = user.started_term
    index1 = term_distance(started_term, termId1)
    index2 = term_distance(started_term, termId2)

    # Create semester records if they don't exist
    if not term1:
        term1 = Semester(term_id=termId1, user=user)
        db.session.add(term1)
        db.session.commit()
    if not term2:
        term2 = Semester(term_id=termId2, user=user)
        db.session.add(term2)
        db.session.commit()

    try:
        # Clear sections for both terms
        term1.sections = json.dumps([])
        term2.sections = json.dumps([])

        # Swap courses between the two terms
        term1Courses = term1.courses
        term1.courses = term2.courses
        term2.courses = term1Courses

        # Swap term names in the path
        term1Name = path[index1]
        path[index1] = path[index2]
        path[index2] = term1Name
        user.path = json.dumps(path)

        # Commit all changes to the database
        db.session.add(term1)
        db.session.flush()
        db.session.add(term2)
        db.session.flush()
        db.session.add(user)
        db.session.commit()

        return "", 204
    except Exception as e:
        print(e)
        return jsonify({"message": "error in bk"}), 500


"""
     profilePicture,
"""

"""
Format:
    [
        [field, [ [word,hover,id],[word,hover,id],[word,hover,id] ]]
        [field, [ [word,hover,id],[word,hover,id],[word,hover,id] ]]
    ]

"""
