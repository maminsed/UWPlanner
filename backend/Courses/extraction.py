from ..Schema import Course, db
from sqlalchemy import insert
import requests
import os
from dotenv import load_dotenv
load_dotenv()

GQL_URL = os.getenv("GQL_URL")
def get_course_data():
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
        print(f"offset:{offset}")
        resp = s.post(GQL_URL, json={"query": GQL_QUERY, "variables": {"limit": limit, "offset": offset}})
        
        resp.raise_for_status()
        payload = resp.json()
        if "errors" in payload:
            raise RuntimeError(payload["errors"])
        
        rows = payload["data"]["course"]
        if not rows:
            break
        try:
            db.session.execute(
                insert(Course),
                rows
            )
            db.session.commit()
        except Exception as e:
            print(str(e))
            errors.extend([(r["code"], str(e)) for r in rows])

        if len(rows) < limit:
            break
        offset+=limit
    return errors

"""
def get_course_data_backup():
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
                # fix this:
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
    return errors


def extract_prereq_backup():
    "/""Function to extract prerequisites from UWFLOW""/"

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    all_courses = Course.query.all()

    errors = [] # (string, string)
    added = []
    counter = 0
    for course in all_courses:
        counter+=1
        if counter > 10:
            db.session.commit()
            break
        driver.get(f"https://uwflow.com/course/{course.subjectCode}{course.catalogNumber}")
        courseCode = course.subjectCode + course.catalogNumber
        time.sleep(1)
        reqs = driver.find_element(By.CSS_SELECTOR, ".sc-pcZJD.iLAGzl")
        if reqs:
            # if it's there: sc-pDbHj gUjOEm
            # if it's not: sc-qWgaf cWJnXs
            detailed_reqs = reqs.find_elements(By.CSS_SELECTOR, ".sc-pDbHj.gUjOEm, .sc-qWgaf.cWJnXs")
            if len(detailed_reqs) < 3:
                errors.append(("req section doesn't have 3 reqs", courseCode))
                continue
            course.preReq = detailed_reqs[0].text
            course.coReq = detailed_reqs[1].text
            course.antiReq = detailed_reqs[2].text
            try:
                db.session.add(course)
                db.session.flush()
                added.append(courseCode)
            except Exception as e:
                errors.append(("error in database: "+str(e), courseCode))
        else:
            errors.append(("no req section", courseCode))

    print(added)
    driver.quit()
    return errors
"""

