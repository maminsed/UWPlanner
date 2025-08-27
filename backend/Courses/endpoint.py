from flask import Blueprint
import requests
from dotenv import load_dotenv
import os

load_dotenv()
courses_bp = Blueprint("Courses", __name__)

@courses_bp.route("/all", methods=["GET"])
def getAllCourses():
    response = requests.get(f"{os.getenv("UW_API_URL")}/Courses/1255", headers={"X-API-KEY": os.getenv("UW_API_KEY")})
    print(f"{os.getenv("UW_API_URL")}/Courses/1255")
    if response.ok:
        res = response.json()
        for course in res:
            print(course)
    return "", 204
