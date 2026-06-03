import os

import requests
from dotenv import load_dotenv
from sqlalchemy import insert

from ..app_logger import logger
from ..Schema import Course, db

load_dotenv()

GQL_URL = os.getenv("GQL_URL")


# TODO: update it so that the course_id matches correctly
def get_course_data():  # You can update this to use JSON
    GQL_QUERY = """
    query Course($limit: Int, $offset: Int) {
        course(limit: $limit, offset: $offset) {
            antireqs
            code
            coreqs
            description
            id
            name
            prereqs
        }
    }
    """
    limit = 500
    offset = 500
    s = requests.Session()
    errors = []
    while True:
        logger.info("Fetching course data", offset=offset)
        resp = s.post(
            GQL_URL,
            json={"query": GQL_QUERY, "variables": {"limit": limit, "offset": offset}},
        )

        resp.raise_for_status()
        payload = resp.json()
        if "errors" in payload:
            raise RuntimeError(payload["errors"])

        rows = payload["data"]["course"]
        if not rows:
            break
        try:
            db.session.execute(insert(Course), rows)
            db.session.commit()
        except Exception as e:
            logger.exception("Failed to insert course batch", offset=offset)
            errors.extend([(r["code"], str(e)) for r in rows])

        if len(rows) < limit:
            break
        offset += limit
    return errors
