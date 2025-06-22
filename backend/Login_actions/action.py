from flask import Blueprint, jsonify
from ..Schema import Major

from collections import defaultdict

"""
NOTE TO SELF:
    DON't FORGET TO ADD BEFOREREQUEST FOR VERIFYING


"""
update_info = Blueprint("UpdateInfo", __name__)

@update_info.route("/majors", methods=["GET"])
def get_majors()->tuple[str,int]:
    """Endpoint to get all the majors grouped by their faculty."""
    try:
        majors = Major.query.all()
        res = defaultdict(list)
        for m in majors:
            res[m.faculty].append(m.name)
        return jsonify({"data": res}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "error in Backend", "error": str(e)}), 500
