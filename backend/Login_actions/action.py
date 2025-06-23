from typing import Optional
from flask import Blueprint, jsonify, make_response
from backend.Schema import Major
from backend.Auth import verify as verify_jwt

from collections import defaultdict

"""
NOTE TO SELF:
    DON't FORGET TO ADD BEFOREREQUEST FOR VERIFYING


"""
update_info = Blueprint("UpdateInfo", __name__)

@update_info.before_request
def verify() -> Optional[make_response]:
    return verify_jwt()


@update_info.route("/majors", methods=["GET"])
def get_majors()->tuple[str,int]:
    """Endpoint to get all the majors grouped by their faculty."""
    try:
        majors = Major.query.all()
        res = defaultdict(list)
        for m in majors:
            res[m.faculty].append([m.name, m.id])
        return jsonify({"data": [[f,res[f]] for f in res.keys()]}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "error in Backend", "error": str(e)}), 500
