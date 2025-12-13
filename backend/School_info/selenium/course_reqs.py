import json
import re
import time
from typing import Literal

from selenium import webdriver
from selenium.common.exceptions import (
    TimeoutException,
)
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

from backend.Schema import Course, db

from .calendar_utils import InfoClass

delayAmount = 15


def bringIntoView(driver: WebDriver, element: WebElement):
    driver.execute_script(
        "window.scrollTo({top: arguments[0].getBoundingClientRect().top + window.pageYOffset + 4, behavior: 'instant' });",  # , behavior: 'smooth'  # "arguments[0].scrollIntoView({block:'start'});",
        element,
    )
    time.sleep(1)


def getLinkAttr(link: WebElement):
    url = link.get_attribute("href") or ""
    urlPrefixUnderGrad = (
        "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/"
    )
    urlPrefixGrad = "https://uwaterloo.ca/academic-calendar/graduate-studies/catalog#/"
    linkType = "external"

    if url.startswith(urlPrefixUnderGrad):
        typeEndIndex = url.find("/", len(urlPrefixUnderGrad))
        linkType = url[len(urlPrefixUnderGrad) : typeEndIndex]

    if url.startswith(urlPrefixGrad):
        typeEndIndex = url.find("/", len(urlPrefixGrad))
        linkType = url[len(urlPrefixGrad) : typeEndIndex]

    return {"value": link.text, "url": url, "linkType": linkType}


# conditionText: (conditionedOn, conditionStatus)
conditionDict: dict[str, tuple[str, str]] = {
    "not completed any of the following": ("not_any", "complete"),
    "not completed nor concurrently enrolled in": ("not_any", "both"),
    "not completed nor concurrently enrolled in the following": ("not_any", "both"),
    "not completed nor concurrently enrolled in any of the following": (
        "not_any",
        "both",
    ),
    "not completed or concurrently enrolled in the following": ("not_any", "both"),
    "not complete nor concurrently enrolled in the following": ("not_any", "both"),
    "not completed": ("not_any", "complete"),
    "must have completed": ("all", "complete"),
    "must have completed the following": ("all", "complete"),
    "complete of the following": ("any", "complete"),
    "completed or concurrently enrolled in the following": ("all", "complete"),
    "completed or concurrently enrolled in": ("all", "both"),
    "the following cannot be used towards this academic plan": ("not_any", "both"),
}

conditionRegExList: list[tuple[str, tuple[str, str]]] = [
    (
        r"^earned a minimum grade of ([0-9\.]*)% in each of the following",
        ("all", "complete"),
    ),
    (
        r"complete the following courses with a( minimum)? cumulative \S+ average of ([0-9\.]*)%",
        ("all", "complete"),
    ),
    (
        r"^if [0-9a-z]* is taken, the following courses? can be used( towards this requirement)?:",
        ("any", "both"),
    ),
    (
        r"^earned a minimum grade of (?:[0-9\.]*)% in (any|all|[0-9]) of the following",
        ("regex", "complete"),
    ),
    (
        r"^(?:must have )?complete(?:d)?(?: at least)? ([0-9]|all|any)(?: of)? the following",
        ("regex", "complete"),
    ),
    (
        r"^(?:complete|choose) ([0-9]|all|any) courses from the following choices",
        ("regex", "complete"),
    ),
    (
        r"^(?:complete|choose)d or concurrently enrolled in at least ([0-9]|all|any) of the following",
        ("regex", "both"),
    ),
    (r"^choose(?: at least)? ([0-9]|all|any) of the following", ("regex", "complete")),
    (
        r"^(?:complete|choose) no more than ([0-9]) from the following",
        ("regex-less_than_", "complete"),
    ),
]


# Map numbers to words
number_words = {
    1: "any",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
}
countingYears = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"]

count = rf"(?:a |the )?(?:equivalent of )?(?:total of )?(?:up to )?(?:at least )?(?:an additional )?(\d\d?(?:\.\d\d?)?|one|{'|'.join(number_words.values())})(?: additional)?(?: \d\.\d(?:-|\s)?unit)?"
countWithAll = rf"(?:an additional )?(\d\d?(?:\.\d\d?)?|all|one|{'|'.join(number_words.values())})(?: additional)?"
years = (
    rf"(\d|any|{'|'.join(countingYears)})"
    + rf"(?:(?: or|, or|,) (\d|any|{'|'.join(countingYears)}))?" * 4
)
nonCourseWords = [
    "labratory",
    "lab",
    "lecture",
    "language",
    "studio",
    "seminar",
    "field",
    "non-math",
]
preCourse = (
    rf"(?:(?:elective|in|additional|{'|'.join(nonCourseWords)}) )?(?!unit|course|the)"
)
postCourse = rf"(?: (?:elective|additional|{'|'.join(nonCourseWords)})(?: or (?:{'|'.join(nonCourseWords)}))?)?(?!(?:unit|course))"
course = r"[a-z]{1,8} ?(?:[0-9]{3}[a-z]?)?(?: ?- ?[a-z]{,8} ?[0-9]{3}[a-z]?)?"
courses = (
    rf"{preCourse}({course}){postCourse}"
    + rf"(?:(?: and | or |, and |, or |, |/| and/or ){preCourse}({course}){postCourse})?"
    * 10
)
level = (
    r"(?:([0-9]00)-?(?: ?level)?(?:,|, or| or|or)? )?" * 3
    + r"([0-9]00-?|any)(?: ?level)?(?:(?:,|, or| or|or)? (below|above|higher))?"
)
sourceBelowAbove = r"(?: ?( or)? (?:at|from|of)(?: the| any)?(?: following)?(?: approved)? (?:(list of(?: approved)? courses?)|(?:list of )?(?:approved )?courses?(?: list(?:s|ed)?)?( below| above)?))?"
end = r"[,\.\s\-_]{,3}(?:taken at (?:one|two|three|four)?(?: or more)? institutions other than the university of waterloo)?(?: ?\(?see additional constraints\)?)?[^a-zA-Z0-9]*$"


def lists(count: bool = False):
    status = "?:" if not count else ""
    singleList = r"list(?: (?![a-z0-9]{2})[0-9a-z]| of(?: approved)? courses)?"
    return (
        rf"({status}(?:[a-z]*\s?[a-z]* )?{singleList})"
        + rf"(?:(?:,|, or| or| and)? ({status}{singleList}))?" * 3
    )


levelArray = lambda x: tuple([i + x for i in range(5)])
coursesArray = lambda x: tuple([i + x for i in range(11)])
listsArray = lambda x: tuple([i + x for i in range(4)])
yearsArray = lambda x: tuple([i + x for i in range(5)])

# count,unit,level,sources,{subjectCodesCondition:(limit,status),takenIn:tuple[int],cap:int|str}
"""
Special Conditions:
    - count = -1: unit = full source
    - unit = -1: unit = course
    - level = -1 and len(levels) == 1: level = [any]
    - course = -1: any
    - if multiple conditions and two of them have the same count and unit, then it will be as if they have or, else it will count as and
"""
groupConditionRegExList: list[
    tuple[
        str, list[tuple[int, int, tuple[int], tuple[int], dict[str, tuple[int] | int]]]
    ]
] = [
    (
        "0036",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?(?: (?:at|from|of)(?: the| any)?(?: following)? {level})?, or (course|unit)s? in an area related to an entrepreneurial endeavor or entrepreneurship, as approved by the conrad associate (director), undergraduate studies",
        [(1, 13, levelArray(14) + (-1,), coursesArray(2) + (20,), {})],
    ),
    (
        "0035",
        rf"^(?:complete|choose) {count} (course|unit)s?,(?: taken)? (?:at|from|of)(?: the| any)? {lists(True)}; choices must be in (at least|at most) {count} different subject codes? \({course}(?:, {course})*\), and {count} (course|unit)s? must be at the {level}",
        [
            (1, 2, (-1,), listsArray(3), {"subjectCodesCondition": (8, 7)}),
            (9, 10, levelArray(11), listsArray(3), {}),
        ],
    ),
    (
        "0030",
        # WARNING: be very careful with this
        rf"^(?:complete|choose) {count}(?: (?:non-?)?{course})? (course|unit)s?,(?: at least)? {count} of which is at the {level}, {countWithAll} from the (same) subject codes?, from the following(?: choices)?: {courses}(?:, {courses})?",
        [
            (1, 2, (-1,), coursesArray(11) + coursesArray(22), {}),
            (
                3,
                2,
                levelArray(4),
                coursesArray(11) + coursesArray(22),
                {"subjectCodesCondition": (9, 10)},
            ),
        ],
    ),
    (
        "0021",
        rf"^(?:complete|choose) {count} (course|unit)s? of {courses} courses (?:at|from|of)(?: the| any)? {level}[,\.\s\-_] {count} (course|unit)s? of which must be (?:at|from|of)(?: the| any)? {level}",
        [
            (1, 2, levelArray(14) + (-1,), coursesArray(3), {}),
            (19, 20, levelArray(21) + (-1,), coursesArray(3), {}),
        ],
    ),
    (
        "0014",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?,? or courses (?:at|from|of|in)(?: the| any)? {level}(?: in an area related to an entrepreneurial endeavor or entrepreneurship)?,? as approved by the [a-z]*(?: associate)? (director)(?:, undergraduate studies)?",
        [(1, 13, (-1,), coursesArray(2), {}), (1, 13, levelArray(14), (19,), {})],
    ),
    (
        "0042",
        rf"^(?:complete|choose) additional (?:course|unit)s? of {courses} courses (?:at|from|of|in)(?: the| any)? {level}(?: up)? to {count} (course|unit)s?",
        [(17, 18, levelArray(11), coursesArray(0), {})],
    ),
    (
        "0009",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? (list of [a-z]* courses?),(?: where)? at least {count} (course|unit)s? must be (?:at|from|of)(?: the| any)? {level}",
        [(1, 2, (-1,), (3,), {}), (4, 5, levelArray(6), (3,), {})],
    ),
    (
        "0038",
        rf"^(?:complete|choose)(?: a total of)? {count} (unit|course)s? (?:at|from|of)(?: the| any)?(?: non-math)? (?:unit|course)s? satisfying the ([a-z\s0-9]*) requirement(?: listed under (?:[a-z]* requirements?|additional constraints|course lists))?",
        [(1, 2, (-1,), (3,), {})],
    ),
    (
        "0031",
        rf"^complete {count} (course|unit)s? (?:at|from|of)(?: the| any)?(?: following)? courses from {count} of the(?: following)? (?:subject code|course)s?:? ?{courses}(?:, {courses})?",
        [
            (
                1,
                2,
                (-1,),
                coursesArray(4) + coursesArray(15),
                {"subjectCodesCondition": (3, "eq")},
            )
        ],
    ),
    (
        "0033",
        rf"^(?:complete|choose) {count} (course|unit)s?(?: at| from| of)?(?: the| any)?(?: following)?((?: list of)? courses?(?: list)?),? or the {level} {course}(?: approved)? courses? listed (above|below)",
        [(1, 2, (-1,), (3,), {}), (1, 2, levelArray(4), (9,), {})],
    ),
    (
        "0032",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {courses}(?: lecture)? courses,?(?: with)?(?: a minimum)? of {count} (course|unit)s? (?:at|from|of)(?: the| any)? {level}",
        [
            (1, 2, (-1,), coursesArray(3), {}),
            (14, 15, levelArray(16), coursesArray(3), {}),
        ],
    ),
    (
        "0037",
        rf"^(?:complete|choose) {count} (unit|course)s? (?:at|from|of)(?: the| any)? {courses} courses,(?: with(?: a minimum of)?)? {count} (unit|course)s? (?:at|from|of)(?: the| any)? {level}",
        [
            (1, 2, (-1,), coursesArray(3), {}),
            (14, 15, levelArray(16), coursesArray(3), {}),
        ],
    ),
    (
        "0024",
        rf"^(?:complete|choose) {count}(?: {course})? (course|unit)s?(?: at| from| of)?(?: the| any)?(?: following)?(?: subject code| choice| course)?s?,? with (at least|at most|a minimum)(?: of)? {count} (course|unit)s?(?: at| from| of)?(?: the| any)?(?: following)? {level}(?: \(including any taken to satisfy the (above|below) requirements\))?: {courses}",
        [
            (1, 2, (-1,), coursesArray(12) + (11,), {}),
            (4, 5, levelArray(6), coursesArray(12) + (11,), {"cap": 3}),
        ],
    ),
    (
        "0003",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {lists(True)},?(?: including| with)? (at least|at most|no more than) {count} (course|unit)s? from {lists(True)}.",
        [(1, 2, (-1,), listsArray(3), {}), (8, 9, (-1,), listsArray(10), {"cap": 7})],
    ),
    (
        "0025",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?(?: at {level})?,(?: at least)? {count} (course|unit)s?(?: of which)? must be (?:at|from|of)(?: the| any)? {level}",
        [
            (1, 13, levelArray(14) + (-1,), coursesArray(2), {}),
            (19, 20, levelArray(21), coursesArray(2), {}),
        ],
    ),
    (
        "0026",
        rf"^(?:complete|choose) {count}(?: {course})? (course|unit)s?(?: chosen)? (?:at|from|of)(?: the| any)?(?: {level})? {courses},? with at least {count}(?: courses?)?(?: chosen)? (?:at|from|of)(?: the| any)? {courses}",
        [
            (1, 2, levelArray(3) + (-1,), coursesArray(8), {}),
            (19, 2, levelArray(3) + (-1,), coursesArray(20), {}),
        ],
    ),
    (
        "0041",
        rf"^(?:complete|choose) {count}(?: (?:non-?)?{course})? (course|unit)s?(?: of courses?)? (?:at|from|of|in)(?: the| any)? (same) subject(?: codes?)? (?:at|from|in)(?: the| any)?( {countWithAll})?(?: of the)?(?: following)?(?: language and culture)?(?: subject code| course)s?: {courses}(?:, {courses})?",
        [
            (
                1,
                2,
                (-1,),
                coursesArray(5) + coursesArray(16),
                {"subjectCodesCondition": (4, 3)},
            )
        ],
    ),
    (
        "0022",
        rf"^(?:complete|choose) {count}(?: {course})? (course|unit)s? (?:at|from|of)(?: the| any)?(?: following)?(?: {level})?(?: (?:at|from|of)(?: the| any)?(?: following)?)?(?: subject code| choice| course)?s?(?: \(including any taken to satisfy the above requirements\))?: {courses}, {count} ({course}) (?:course|unit)s? (?:at|from|of)(?: the| any)? {level}",
        [
            (1, 2, levelArray(3) + (-1,), coursesArray(8), {}),
            (19, 2, levelArray(21), (20,), {}),
        ],
    ),
    (
        "0017",
        rf"^(?:complete|choose) {count} (?:at|from|of)(?: the| any)? (this list) or any(?: additional)? {courses} (course|unit)s? (?:at|from|of)(?: the| any)? {level}",
        [(1, 14, levelArray(15), coursesArray(3) + (2,), {})],
    ),
    (
        "0018",
        rf"^(?:complete|choose) {count} (course|unit)s?(?: at| from| of)?(?: the| any)? {lists(True)}. complete {count} (course|unit)s?(?: at| from| of)?(?: the| any)? {lists(True)}(?:,? or(?: additional courses)? from {lists(True)})?",
        [
            (1, 2, (-1,), listsArray(3), {}),
            (7, 8, (-1,), listsArray(9) + listsArray(13), {}),
        ],
    ),
    (
        "0034",
        rf"^(?:subject concentration: )?complete {count} (course|unit)s?,( all from| at least| at most)(?: any)? {count}(?: \(and only {count}\))? (?:at|from|of)(?: the| any)?(?: following)?(?: language and culture )?(?: subject codes?| courses?)?: {courses}(?:, {courses})?",
        [
            (
                1,
                2,
                (-1,),
                coursesArray(6) + coursesArray(17),
                {"subjectCodesCondition": (4, 3)},
            )
        ],
    ),
    # takenIn:
    (
        "0039",
        rf"^(?:complete|choose) {count} {courses}(?: elective)? (course|unit)s?(?: (?:at|from|of)(?: the| any)? {level})?, taken in {years} year",
        [(1, 13, levelArray(14) + (-1,), coursesArray(2), {"takenIn": yearsArray(19)})],
    ),
    (
        "0002",
        rf"^(?:complete|choose) {count} (course|unit)s?,?(?: including| with)? (at least|at most|no more than) {count}(?: {count})? (course|unit)s?(?: course| unit)?s?,(?: at| from| of)?(?: the| any)?(?: following)? ((?:course|below|above) list)(?: {lists(True)})?",
        [(1, 2, (-1,), (-1,), {}), (4, 6, (-1,), listsArray(8) + (7,), {"cap": 3})],
    ),
    (
        "0020",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)?(?: following)?(?: list of)? courses?(?: or subjects?)?(?: listed)?(?: or)? (below|above)(?: or(?: at| from| of)?(?: the| any)?(?: following)? {lists(True)})?",
        [(1, 2, (-1,), listsArray(4) + (3,), {})],
    ),
    (
        "0010",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {courses} courses?,?(?: at| from)?(?: the| any)? {level}{sourceBelowAbove}",
        [(1, 2, levelArray(14), coursesArray(3) + (19, 20, 21), {})],
    ),
    (
        "0012",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {level}(?: courses?)? from: {courses}",
        [(1, 2, levelArray(3), coursesArray(8), {})],
    ),
    (
        "0001",
        rf"^(?:complete|choose) a minimum of {count} (course|unit)s?(?: totaling {count} (course|unit)s?)?(?: or greater)? (?:according to the requirements (below))?",
        [(1, 2, (-1,), (-1, 4), {}), (3, 4, (-1,), (-1, 4), {})],
    ),
    (
        "0043",
        rf"^(?:complete|choose)(?: additional)?(?: associated)?(?: laboratory)? (?:course|unit)s? (?:at|from|of)(?: the| any)? {courses} (course|unit)s? (above|bellow)",
        [(-1, 11, (-1,), coursesArray(0) + (12,), {})],
    ),
    (
        "0004",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? (elective) courses?(?:, with a maximum of 1.0 lab units)?",
        [(1, 2, (-1,), (3,), {})],
    ),
    (
        "0007",
        rf"^(?:complete|choose) {count} (course|unit)s?(?: at| from| of)?(?: the| any)?(?: following)?(?: ({course}) courses)? (?:from the|in additional) (following lists?)(?: of ({course}) courses?)?",
        [(1, 2, (-1,), (4,), {})],
    ),
    (
        "0011",
        rf"^(?:complete|choose) the {lists(True)} requirements?(?: below| above)?",
        [(-1, -1, (-1,), listsArray(1), {})],
    ),
    (
        "0013",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of|in)(?: the| any)? {courses} (?:course|unit)s?(?:,? (?:at|from|of|in)(?: the| any)? {level})?{sourceBelowAbove}",
        [(1, 2, levelArray(14) + (-1,), coursesArray(3) + (19, 20, 21), {})],
    ),
    (
        "0027",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?(?: \(\d\.\d unit\))? (?:at|from|of)(?: the| any)? {level}{sourceBelowAbove}",
        [(1, 13, levelArray(14), coursesArray(2) + (19, 20, 21), {})],
    ),
    (
        "0015",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {level}{sourceBelowAbove}",
        [(1, 2, levelArray(3), (8, 9, 10), {})],
    ),
    (
        "0029",
        rf"^(?:complete|choose) {count}(?:(?: of)? {course}(?: courses?)?)? (course|unit)s?(?: {course} course)?(?: (?:at|from|of)(?: the| any)?(?: following)?(?: list of)? courses?(?: list(?:ed|s)?)? (below|above) or(?: an additional)?(?: course)?)? (?:at|from|of)(?: the| any)?(?: following)?(?: {course})?(?: subject code| choice)?s?: {courses}(?:, {courses})?(?:, {courses})?",
        [(1, 2, (-1,), coursesArray(3) + coursesArray(14) + coursesArray(25), {})],
    ),
    (
        "0008",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)?(?: options in)? {lists(True)}",
        [(1, 2, (-1,), listsArray(3), {})],
    ),
    (
        "0023",
        rf"^(?:complete|choose) {count}(?: {course})? (course|unit)s?(?: \(\d\.\d units?\))?(?: at| from| of)?(?: the| any)?(?: following)?(?: {level})?(?: at| from| of)?(?: the| any)?(?: following)?(?: subject code| choice| course)?s?(?: \(including any taken to satisfy the (above|below) requirements\))?: {courses}(?:; excluding courses cross-listed with a {course} course)?",
        [
            (1, 2, levelArray(3) + (-1,), coursesArray(9) + (8,), {}),
        ],
    ),
    # Danger Zone
    (
        "0005DZ",
        rf"^(?:complete|choose) {count}(?: non-math| elective| labratory| cs)? (course|unit)s?(?: chosen)?(?: at| from| of)?(?: the| any)?(?:(?: in)? additional)? {courses}(?: courses)?",
        [(1, 2, (-1,), coursesArray(3), {})],
    ),
    (
        "0016DZ",
        rf"^(?:complete|choose) {count} (course|unit)s?(?: at| from| of)?(?: the| any)?(?: language)?( courses)?(?: at| from| of)?(?: the| any)?(?: approved)? (courses(?: list)?)(?: below)?",
        [(1, 2, (-1,), (3,), {})],
    ),
    (
        "0028DZ",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?",
        [(1, 13, (-1,), coursesArray(2), {})],
    ),
    (
        "0040",
        # IMPORTANT TO BE LAST
        rf"^(?:complete|choose) {count} (course|unit)s?(?: of)?(?: additional )?(?: courses?)?(?: \({count} unit\))?(?: at| from| of)?(?: the| any)?(?: lists?)?(?: of)?(?: approved courses?)?(?: course lists?)?( following lists?| above| below)?(?: of courses)?(?: or subjects)?(?: lists?)?(?:; the {years} course can be taken from {lists()})?",
        [(1, 2, (-1,), (-1, 4), {})],
    ),
    (
        "0006DZ",
        rf"^(?:complete|choose) {count}(?: or \d)? (?:at|from|of)?(?: the| any)?([a-z]+ electives?(?: from {lists()})?)",
        [(1, -1, (-1,), (2,), {})],
    ),
    (
        "0019DZ",
        rf"^(?:complete|choose) {count}(?: senior)? {courses}( seminars)?",
        [(1, -1, (-1,), coursesArray(2) + (13,), {})],
    ),
    # (
    #     rf"^(?:complete|choose) {count} (course|unit)s? of ({course})( laboratory)? courses,?(?:(?: at| from| of)?(?: the| any)? {level})?",
    #     [(1, 2, levelArray(5), (3, 4), {})],
    # ),
]


def deciToEnglishNumber(matched_regex: str, infoInstance: InfoClass):
    matched_regex = matched_regex.strip().lower()

    if matched_regex == "all":
        return "all"
    if matched_regex == "one":
        return "any"

    try:
        num = int(matched_regex) if matched_regex != "any" else 1
        return number_words.get(num, "error139")
    except ValueError:
        if matched_regex in number_words.values():
            return matched_regex
        infoInstance.add(
            "differentErrors",
            f"120: error occured in deciToEnglishNumber for {infoInstance.id}-{matched_regex}",
        )
        return "error139"


def strNumberToFloat(str_num: str):
    str_num = str_num.lower().strip()
    try:
        num = float(str_num)
        return num
    except ValueError:
        if str_num == "one":
            return 1.0
        for res, val in number_words.items():
            if val == str_num:
                return float(res)
        for res, year in enumerate(countingYears):
            if year == str_num:
                return float(res + 1)
        raise RuntimeError(f"{str_num} is not a number!")


def takenInTranslator(rawInput: None | tuple[int], splitedRegex: list[str | None]):
    if rawInput is None:
        return None
    res = []
    for idx in rawInput:
        if splitedRegex[idx] is None:
            continue
        res.append(int(strNumberToFloat(splitedRegex[idx])))
    return res


def subjectCodesTranslator(
    rawInput: None | tuple[int, int | str],
    splitedRegex: list[str | None],
    infoInstance: InfoClass,
):
    # rawInput:(limit,status)
    if rawInput is None:
        return None
    limit, status = rawInput
    limit = (splitedRegex[limit] or "").strip()
    if limit == "one" or limit == "all" or not limit:
        limit = "any"
    statusMap = {
        "at least": "gt",
        "at most": "lt",
        "all from": "eq",
        "only": "eq",
        "same": "eq",
        "eq": "eq",
    }

    if type(status) == int:
        status = splitedRegex[status].strip()
    if not status or status is None or status not in statusMap:
        infoInstance.add(
            "differentErrors", f"{rawInput} at {splitedRegex} has status: '{status}'"
        )
        return None

    return {"status": statusMap[status], "limit": limit}


def extractExcluding(conditionTextLower: str) -> list[str]:
    phrase = rf"\((?:excluding|exclusive)? of {courses}\)"
    matched = re.split(phrase, conditionTextLower)
    if len(matched) > 1:
        return process_sources(matched, coursesArray(0))
    else:
        return []


def safe_find_element(element: WebElement, by, value):
    try:
        return element.find_element(by, value)
    except:
        return None


def process_sources(regexMatches: list[str | None], sourceIndecies: list[int]):
    processedSources: list[str] = []
    hasNegOne = False
    for sourceIdx in sourceIndecies:
        if sourceIdx == -1:
            hasNegOne = True
            continue
        source = regexMatches[sourceIdx]
        if source is None or source == "":
            continue
        source = (
            re.sub(
                r"(,|, or| or| from) list",
                "-list",
                source.replace("electives", "elective"),
            )
            .replace("and list", "&list")
            .strip()
        )
        if source == "following list" or "list of course" in source:
            source = "below"
        elif source == "following lists":
            source = "course lists"
        elif re.match(
            r"^[a-z]{1,8} [0-9]{3}[a-z]?(?: ?- ?[a-z]{,8} [0-9]{3}[a-z]?)?$", source
        ):
            source = source.replace(" ", "")
        elif re.match(r"list of [a-z]* courses?", source):
            source = (
                source.replace("list of ", "").replace("courses", "course") + " list"
            )
        processedSources.append(source)
    if hasNegOne and len(processedSources) == 0:
        return ["any"]
    return processedSources


def extract_conditionText(
    conditionText: str, infoInstance: InfoClass, strict: bool = False
) -> tuple[Literal["none", "onStatus", "grouped"], str, tuple | dict]:
    """Returns: tuple(found,matchedText,onStatus)
    found: 'none'|'onStatus'|'grouped',
    matchedText:str,
    payload: (conditionedOn, conditionedStatus)|groupCondition,
    """
    conditionText = re.sub(r"\s+", " ", conditionText.lower()).strip()
    found = ""
    paylaod = ()
    if not strict:
        for key in conditionDict.keys():
            if conditionText.startswith(key) and len(key) > len(found):
                found = key
                paylaod = conditionDict[key]
    elif conditionText in conditionDict:
        found = conditionText
        paylaod = conditionDict[conditionText]
    if not len(found):
        for regex, condition in conditionRegExList:
            matched = re.match(regex, conditionText)
            if matched is not None:
                found = matched.group(0)
                paylaod = condition
                if paylaod[0].startswith("regex"):
                    paylaod = (
                        f"{paylaod[0].replace('-', '').replace('regex', '')}"
                        + deciToEnglishNumber(matched.group(1), infoInstance),
                        condition[1],
                    )
                break
    if len(found) > 0:
        return "onStatus", found, paylaod

    for id, regex, conditions in groupConditionRegExList:
        matched = re.split(rf"{regex}{end}", conditionText, flags=re.IGNORECASE)
        if len(matched) > 1:
            res = extractGroupCondition(
                conditionText, infoInstance, matched, conditions
            )
            infoInstance.add(
                "differentGroupedCondition",
                conditionText.lower(),
                [id, infoInstance.id] + res,
            )
            return ("grouped", re.match(rf"{regex}{end}", conditionText).group(0), res)
    for id, regex, conditions in groupConditionRegExList:
        matched = re.split(regex, conditionText, flags=re.IGNORECASE)
        if len(matched) > 1:
            res = extractGroupCondition(
                conditionText, infoInstance, matched, conditions
            )
            infoInstance.add(
                "carefullGroupedCondition",
                conditionText.lower(),
                [id, infoInstance.id] + res,
            )
            return ("grouped", re.match(regex, conditionText).group(0), res)
    return "none", "", ()


def extractGroupCondition(
    conditionText: str,
    infoInstance: InfoClass,
    matched: list[str | None],
    conditions: list[int | tuple[int] | dict[str]],
):
    res = []
    for count, unit, levels, sources, additional in conditions:
        resLevels = []
        hasNegOne = False
        for levelIdx in levels:
            if levelIdx == -1:
                hasNegOne = True
                continue
            level: str | None = matched[levelIdx]
            if level is None:
                continue
            level = level.replace("-", "").strip()
            if (
                level == "any"
                or level == "above"
                or level == "below"
                or level == "higher"
            ):
                resLevels.append(level)
            else:
                try:
                    resLevels.append(int(level))
                except ValueError:
                    infoInstance.add(
                        "differentErrors",
                        f"{conditionText}-{level} is not a valid level",
                    )
        if hasNegOne and not len(resLevels):
            resLevels.append("any")
        resCount = 1.0 if count == -1 else strNumberToFloat(matched[count])
        resUnit = matched[unit] if unit != -1 else "course"
        if count == -1:
            resUnit = "full source"

        cap = additional.get("cap", None)
        capDict = {
            "no more than": "max",
            "no more": "max",
            "max": "max",
            "min": "min",
            "at least": "min",
            "at most": "max",
        }
        if cap is not None:
            if type(cap) == int:
                cap = matched[cap]
            if cap in capDict:
                cap = capDict[cap]
            elif cap != "":
                infoInstance.add(
                    f"{conditionText} is supposed to have cap but it actually has: {cap}"
                )
                cap = None
        res.append(
            {
                "count": resCount,
                "unit": resUnit,
                "levels": resLevels,
                "additional": "additional" in conditionText,
                "sources": process_sources(matched, sources),
                "subjectCodesCondition": subjectCodesTranslator(
                    additional.get("subjectCodesCondition", None),
                    matched,
                    infoInstance,
                ),
                "takenIn": takenInTranslator(additional.get("takenIn", None), matched),
                "cap": cap,
                "excluding": extractExcluding(conditionText.lower()),
            }
        )

    return res


def extract_non_ul_container_info(element: WebElement, infoInstance: InfoClass):
    res = {}
    conditionText = element.text.replace("\n", "").strip()
    found, matchedText, payload = extract_conditionText(
        conditionText.lower(), infoInstance
    )

    relatedLinks = []
    if found == "onStatus":
        newConditionText = (
            conditionText[len(matchedText) :].replace(":", "").replace("\n", "").strip()
        )
        relatedLinks = [
            {"value": r.strip(), "url": "", "linkType": "course"}
            for r in re.sub(r"[.,!?><\\/]", " ", newConditionText).split(" ")
            if r.strip() != ""
        ]
        res["appliesTo"] = [
            {
                "conditionedOn": "final",
                "conditionStatus": "none",
                "conditionText": newConditionText,
                "appliesTo": [],
                "relatedLinks": relatedLinks,
            }
        ]
        res["conditionedOn"], res["conditionStatus"] = payload
        res["conditionText"] = matchedText
    elif found == "none":
        res["conditionedOn"] = "final"
        res["conditionStatus"] = "none"
        res["conditionText"] = conditionText
        res["appliesTo"] = []
    else:
        res["conditionedOn"] = "final"
        res["conditionStatus"] = "complete"
        res["conditionText"] = conditionText
        res["groupConditions"] = payload
        res["appliesTo"] = []
        if any(
            not groupCondition["levels"] or not groupCondition["sources"]
            for groupCondition in payload
        ):
            infoInstance.add(
                "differentErrors",
                f"267: {conditionText.lower()}-{infoInstance.id} levels or sources is empty",
            )

    links = element.find_elements(By.TAG_NAME, "a")
    for link in links:
        relatedLinks.append(getLinkAttr(link))
    if found == "onStatus":
        res["appliesTo"][0]["relatedLinks"] = relatedLinks
        res["relatedLinks"] = []
    else:
        if len(links) == 0 and found == "none":
            infoInstance.add("differentConditionText", conditionText, infoInstance.id)
            print(f"conditionText: {conditionText}")
        res["relatedLinks"] = relatedLinks
    return res


# startpoint has to be the ul
def extractNested(startPoint: WebElement, infoInstance: InfoClass):
    listItemsCSS = ":scope li:not(:scope li li)"

    listItems = startPoint.find_elements(By.CSS_SELECTOR, listItemsCSS)
    res = []
    for listItem in listItems:
        currRes = {}
        members = safe_find_element(listItem, By.TAG_NAME, "ul")

        # if it has an inner ul then it can't be course or major
        currRes["appliesTo"] = []
        if members:
            # extract text
            ul_text = members.text.strip()
            conditionText = (
                listItem.text.replace(ul_text, "")
                .replace("\n", "")
                .replace(":", "")
                .strip()
            )
            currRes["conditionText"] = conditionText
            # extract status and type
            infoInstance.add("differentSectionTypes", conditionText, infoInstance.id)
            found, _, payload = extract_conditionText(
                conditionText.lower(), infoInstance, True
            )
            if found == "onStatus":
                currRes["conditionedOn"], currRes["conditionStatus"] = payload
            elif found == "grouped":
                count = max(gc["count"] for gc in payload)
                if count != "any":
                    count = str(
                        int(count * (1 if payload[0]["unit"] == "course" else 2))
                    )
                currRes["conditionedOn"] = deciToEnglishNumber(count, infoInstance)
                currRes["conditionStatus"] = "complete"
                currRes["groupConditions"] = payload
            else:
                currRes["conditionedOn"] = "unclassified"
                currRes["conditionStatus"] = "none"
                infoInstance.add(
                    "differentErrors",
                    f"352: {conditionText} not in conditionDict at {infoInstance.id}",
                )

            # extract members
            currRes["appliesTo"] = extractNested(members, infoInstance)
            currRes["relatedLinks"] = []
        # if it does not have an inner ul then it's
        else:
            currRes = extract_non_ul_container_info(listItem, infoInstance)
        res.append(currRes)
    if not len(listItems):
        infoInstance.add(
            "differentErrors", f"{infoInstance.id} does not have any nested"
        )
    return res


def extractContainerInfo(section: WebElement, infoInstance: InfoClass):
    # section has to be a top level ul
    """return:
    decimalCount: "any" | "two" - "nine"
    ListInfo: {
        conditionedOn: 'all' | decimalCount | 'not_any' | 'final' | 'unclassified',
        conditionStatus: 'complete' | 'currently_enrolled' | 'both' | 'none',
        conditionText: str,
        appliesTo: ListInfo[],
        groupConditions?: {
            count: float;
            unit: 'unit' | 'course' | 'full sourse';
            additional: bool;
            levels: [100|200|300|400|500|"any"|"above"|"below"|"higher"];
            sources: [courseCode|"above"|"below"|"courses list"|"\\S+ elective"|"\\S+ elective-list 1-list 2&list 3 ..."|"any"];
            subjectCodesCondition?: {
                limit: 'all' | decimalCount;
                status: 'lt'|'gt'|'eq':
                # EX: {limit: 1, status: lt}: at most 1 different subject code
            };
            takenIn?: int[]
            cap?: "max"|"min"|"exact"
            excluding: courseCode[]
        }[]
        relatedLinks: {value: str, url: str, linkType: 'program'|'course'|'external'}[]
    }

    """
    firstList = safe_find_element(section, By.TAG_NAME, "li")
    res = {}
    sectionHeader = None
    if firstList:
        try:
            sectionHeader = safe_find_element(
                firstList, By.CSS_SELECTOR, ":scope > span"
            ).text
            infoInstance.add("differentSectionTypes", sectionHeader, infoInstance.id)
        except:
            pass

    # we get the inner ul
    nestedUl = safe_find_element(firstList, By.CSS_SELECTOR, ":scope > ul")

    # If we were successfull, we just find the children normally
    if nestedUl and sectionHeader:
        res["conditionText"] = sectionHeader
        found, _, payload = extract_conditionText(sectionHeader, infoInstance, True)
        if found == "onStatus":
            res["conditionedOn"], res["conditionStatus"] = payload
        elif found == "grouped":
            count = max(gc["count"] for gc in payload)
            if count != "any":
                count = str(int(count * (1 if payload[0]["unit"] == "course" else 2)))
            res["conditionedOn"] = deciToEnglishNumber(count, infoInstance)
            res["conditionStatus"] = "complete"
            res["groupConditions"] = payload
        else:
            res["conditionedOn"], res["conditionStatus"] = "unclassified", "none"
            infoInstance.add(
                "differentErrors",
                f"{sectionHeader} not in conditionDict-{infoInstance.id}",
            )
        res["relatedLinks"] = []
        res["appliesTo"] = extractNested(nestedUl, infoInstance)
    # if we werent then we are one of the children
    else:
        results = extractNested(section, infoInstance)
        if len(results) == 0:
            results = extract_non_ul_container_info(section, infoInstance)
        if len(results) == 1:
            res = results[0]
        else:
            res["conditionedOn"] = "unclassified"
            res["conditionStatus"] = "none"
            res["conditionText"] = ""
            res["appliesTo"] = results
            res["relatedLinks"] = []
            infoInstance.add("differentErrors", f"{infoInstance.id}-119")
    return res


def addGroupTodb(
    group_name: str,
    members: list[dict[str, str]],
    driver: WebDriver,
    infoInstance: InfoClass,
):
    paran_start = group_name.index("(")
    paran_end = group_name.index(")")
    group_code = group_name[paran_start + 1 : paran_end].strip()
    group_name = group_name[:paran_start].strip()
    # extractin codes
    course_dict: dict[str, str] = {}
    for member in members:
        course = member["course"]
        hyphen = course.index("-")
        course_code = course[:hyphen].strip().lower()
        member["course_code"] = course_code
        member["course_name"] = course[hyphen + 1 :].strip()
        course_dict[course_code] = member
    # getting matching courses
    courses = Course.query.filter(Course.code.in_(course_dict.keys())).all()

    # setting constants
    courseHeaderCSS = 'div[class*="course-view__itemTitleAndTranslationButton___"]'
    courseSectionCSS = "div.noBreak"
    sectionHeadersCSS = "h3"
    sectionTextContainerCSS = "div[class*='course-view__pre___iwNIQ']"
    sectionsTextCSS = "div.rules-wrapper ul"
    searchingHeaders = [
        "prerequisites",
        "antirequisites",
        "corequisites",
        "cross-listed courses",
    ]
    main_window = driver.current_window_handle
    counter = 0
    for course in courses:
        # getting course values
        curr = course_dict[course.code]
        courseInfo = {}
        print(f"Currently at: {course.code}")
        driver.switch_to.new_window("tab")
        driver.get(curr["url"])
        # waiting until the page loads
        WebDriverWait(driver, delayAmount).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, courseHeaderCSS))
        )
        print("started process")
        # finding all sections on the page
        sections = driver.find_elements(By.CSS_SELECTOR, courseSectionCSS)
        for section in sections:
            header = safe_find_element(section, By.CSS_SELECTOR, sectionHeadersCSS)
            if not header:
                infoInstance.add("differentErrors", f"{course.code}-{227}")
                continue
            header = header.text.lower()
            # checking for cross-listed

            if header not in searchingHeaders:
                infoInstance.add("differentHeaders", header, course.code)
                continue
            container = safe_find_element(
                section, By.CSS_SELECTOR, sectionTextContainerCSS
            )
            if not container:
                infoInstance.add("differentErrors", f"{course.code}-239")
                continue

            if header == "cross-listed courses":
                links = container.find_elements(By.TAG_NAME, "a")
                courseInfo[header] = [getLinkAttr(l) for l in links]
                continue
            counter += 1
            listVersion = safe_find_element(container, By.CSS_SELECTOR, sectionsTextCSS)
            infoInstance.id = f"{course.code}-header"
            if listVersion:
                print("list found")
                course_json = extractContainerInfo(listVersion, infoInstance)
            else:
                print("list not found")
                course_json = extract_non_ul_container_info(container, infoInstance)
            courseInfo[header] = course_json
        # Adding course information to db
        # differentCourseJsons[course.code] = courseInfo
        courseInfo = json.dumps(courseInfo)
        infoInstance.add("total", infoInstance.get("total") + 1)
        if courseInfo != course.courseInfo:
            infoInstance.add("differentUpdated", course.code)
            course.courseInfo = courseInfo
            db.session.add(course)
            db.session.flush()
        # course.url = curr["url"]
        # course.groupName = group_name
        # course.groupCode = group_code

        driver.close()
        driver.switch_to.window(main_window)
    db.session.commit()


def get_course_reqs():
    # TODO:  add excluding to the end
    #       update courses to have a column with unit (like how many units it is)
    classGroupCSS = 'div[class*="style__collapsibleBox___"]'
    expandButtonCSS = 'h2[class*="style__title___"]'
    linkContainerCSS = 'div[class*="style__columns___"]'
    infoInstance = InfoClass(
        {
            "differentSectionTypes": {},
            "differentConditionText": {},
            "differntHeaders": {},
            "differentErrors": [],
            # "differentCourseJsons": differentCourseJsons,
            "differentUpdated": [],
            # "_info": f"updated: {len(differentUpdated)} of {total} courses",
            "total": 0,
        }
    )

    UNDERGRAD_LINK = (
        "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses"
    )
    GRAD_LINK = (
        "https://uwaterloo.ca/academic-calendar/graduate-studies/catalog#/courses"
    )

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.get(UNDERGRAD_LINK)
    driver.maximize_window()
    wait = WebDriverWait(driver, delayAmount)
    time.sleep(1)

    # 2) Dismiss the cookie banner if present
    try:
        # Try a few common selectors; adjust to the site if you know the exact one
        cookie_accept = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.agree-button"))
        )
        cookie_accept.click()
        # Wait for the overlay to vanish
        wait.until(
            EC.invisibility_of_element_located(
                (
                    By.CSS_SELECTOR,
                    "div.eu-cookie-compliance-banner.eu-cookie-compliance-banner-info.eu-cookie-compliance-banner--default",
                )
            )
        )
    except TimeoutException:
        print("banner not found...")
        pass

    # TODO: this might break if the website takes long
    classGroups = wait.until(
        EC.visibility_of_any_elements_located((By.CSS_SELECTOR, classGroupCSS))
    )
    # classGroups = driver.find_elements(By.CSS_SELECTOR, classGroupCSS)
    offset = 100
    limit = 27
    i = 0
    groups = {}
    print(
        f"Hi, were starting with {len(classGroups)} cgs - going up to {min(limit, len(classGroups) - offset)}"
    )
    try:
        while i < min(limit, len(classGroups) - offset):
            cg = classGroups[offset + i]
            i += 1
            updateGroup = {}
            expandButton = cg.find_element(By.CSS_SELECTOR, expandButtonCSS)
            # bringing the button into view
            bringIntoView(driver, expandButton)

            # openning it
            expandButton = WebDriverWait(cg, delayAmount).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, expandButtonCSS))
            )
            expandButton.click()
            group_name = expandButton.text
            updateGroup["group_name"] = group_name
            groups[group_name] = "open"

            linkContainers = cg.find_elements(By.CSS_SELECTOR, linkContainerCSS)
            updateGroup["members"] = []
            for linkContainer in linkContainers:
                # link = linkContainer.find_element(By.TAG_NAME, "a")
                link = WebDriverWait(linkContainer, delayAmount).until(
                    EC.visibility_of_element_located((By.TAG_NAME, "a"))
                )
                updateGroup["members"].append(
                    {"course": link.text, "url": link.get_attribute("href") or ""}
                )

            # closing it
            expandButton = WebDriverWait(cg, delayAmount).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, expandButtonCSS))
            )
            expandButton.click()
            addGroupTodb(
                updateGroup["group_name"],
                updateGroup["members"],
                driver,
                infoInstance,
            )
            # waiting for it to actualy close
            try:
                expandGroup = cg.find_element(
                    By.CSS_SELECTOR, "div.ReactCollapse--collapse"
                )
                WebDriverWait(cg, delayAmount).until(EC.staleness_of(expandGroup))
            except Exception:
                pass
            groups[group_name] = "close"
        print("Done")
    except Exception as e:
        print(e)
        print("error occured")
    finally:
        if driver:
            driver.quit()
        return infoInstance.returnJson(
            {
                "i": i + offset,
                "groups": groups,
                "_info": f"updated: {len(infoInstance.get('differentUpdated'))} of {infoInstance.get('total')} courses",
            }
        )
