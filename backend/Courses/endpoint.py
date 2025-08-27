from flask import Blueprint, jsonify
import requests
from dotenv import load_dotenv
import os
from ..Schema import Course, db

load_dotenv()
courses_bp = Blueprint("Courses", __name__)

@courses_bp.route("/all", methods=["GET"])
def getAllCourses():
    response = requests.get(f"{os.getenv("UW_API_URL")}/Courses/1255", headers={"X-API-KEY": os.getenv("UW_API_KEY")})
    errors = []
    counter = 0
    if response.ok:
        res = response.json()
        for course in res:
            if counter > 10:
                db.session.commit()
                counter=0
            counter+=1
            try:
                c = Course(
                        courseId = course["courseId"],
                        offeredIn = "1255",
                        associatedAcademicGroupCode = course["associatedAcademicGroupCode"],
                        associatedAcademicOrgCode = course["associatedAcademicOrgCode"],
                        subjectCode = course["subjectCode"],
                        catalogNumber = course["catalogNumber"],
                        title = course["title"],
                        descriptionAbbreviated = course["descriptionAbbreviated"],
                        description = course["description"],
                        gradingBasis = course["gradingBasis"],
                        courseComponentCode = course["courseComponentCode"],
                        enrollConsentCode = course["enrollConsentCode"],
                        dropConsentCode = course["dropConsentCode"]
                    )
                db.session.add(c)
                db.session.flush()
            except Exception as e:
                print(str(e))
                errors.append((course, str(e)))
        db.session.commit()
    return jsonify({"errors": errors}), 200
