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
    (r"^eligible (subject code|course)s? for list [a-z0-9]:?", ("any", "complete")),
    (
        r"^the following(?: lists of courses)? are ineligible as List [a-z0-9](?: [a-z]*)? courses?.?",
        ("not_any", "complete"),
    ),
    (
        r"^all [a-z\s]* students?(, with the exceptions? of .*)? must complete the following list [a-z0-9] courses?.?",
        ("all", "complete"),
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
preCourse = rf"(?:(?:elective|in|additional|{'s?|'.join(nonCourseWords)}s?) )?(?!unit|course|the)"
postCourse = rf"(?: (?:elective|additional|{'s?|'.join(nonCourseWords)}s?)(?: or (?:{'s?|'.join(nonCourseWords)}s?))?)?(?!(?:unit|course))"
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
        rf"({status}(?: from)?(?:[a-z]*\s?[a-z]* )?{singleList})"
        + rf"(?:(?:,|, or| or| and)?(?: from)? ({status}{singleList}))?" * 3
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
        "0044",
        rf"^(?:complete|choose) {count} (course|unit)(?: \((?:minimum )?\d\.\d\d? unit\))? with an eligible subject code for {lists(True)}(?: or listed individually (below))?.?(?:(?: courses that appear on list {lists(True)})?(?:( or| and|, )? the (exclusions list))? are ineligible.?)?(?: courses that satisfy the university (communication requirement)(?: for the student.s major)? are ineligible)?",
        [(1, 2, (-1,), listsArray(3) + (7,), {"excluding": listsArray(8) + (12, 13)})],
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
        "0046",
        rf"^complete {count} {courses} (course|unit)s?: {count} (unit|course)s? must be from {lists(True)}.?(?:(?: the remaining)? {count} (course|unit)s? can be from {lists(True)})?",
        [
            (1, 13, (-1,), coursesArray(2), {}),
            (14, 15, (-1,), listsArray(16), {"additional": True}),
            (
                20,
                21,
                (-1,),
                listsArray(22),
                {"extra": True, "additional": True},
            ),  # TODO:do something here
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
        "0025",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?(?: at {level})?,(?: at least)? {count} (course|unit)s?(?: of which)? must be (?:at|from|of)(?: the| any)? {level}",
        [
            (1, 13, levelArray(14) + (-1,), coursesArray(2), {}),
            (19, 20, levelArray(21), coursesArray(2), {}),
        ],
    ),
    (
        "0045",
        rf"^the remaining {count} [a-z]* (?:elective|course)s? can be from {lists(True)}",
        [(1, -1, (-1,), listsArray(2), {"additional": True})],
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
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {courses}( approved)? courses?,?(?: at| from)?(?: the| any)? {level}{sourceBelowAbove}",
        [(1, 2, levelArray(15), coursesArray(3) + (14, 20, 21, 22), {})],
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
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?(?: \(\d\.\d units?\))? (?:at|from|of)(?: the| any)? {level}{sourceBelowAbove}",
        [(1, 13, levelArray(14), coursesArray(2) + (19, 20, 21), {})],
    ),
    (
        "0015",
        rf"^(?:complete|choose) {count} (course|unit)s? (?:at|from|of)(?: the| any)? {level}{sourceBelowAbove}",
        [(1, 2, levelArray(3), (8, 9, 10), {})],
    ),
    (
        "0029",
        rf"^(?:complete|choose) {count}(?:(?: of)? {course}(?: courses?)?)? (course|unit)s?(?: of)?(?: {course} courses?)?(?: (?:at|from|of)(?: the| any)?(?: following)?(?: list of)? courses?(?: list(?:ed|s)?)? (below|above) or(?: an additional)?(?: course)?)? (?:at|from|of)(?: the| any)?(?: following)?(?: {course})?(?: subject code| choice)?s?: {courses}(?:, {courses})?(?:, {courses})?",
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
        "0028DZ",
        rf"^(?:complete|choose) {count} {courses} (course|unit)s?",
        [(1, 13, (-1,), coursesArray(2), {})],
    ),
    (
        "0016DZ",
        rf"^(?:complete|choose) {count} (course|unit)s?(?: at| from| of)?(?: the| any)?(?: language)?( courses)?(?: at| from| of)?(?: the| any)?(?: approved)? (courses(?: list)?)(?: below)?",
        [(1, 2, (-1,), (3,), {})],
    ),
    (
        "0040DZ",
        # IMPORTANT TO BE LAST
        rf"^(?:complete|choose) {count} (course|unit)s?(?: of)?(?: additional )?(?: courses?)?(?: \({count} unit\))?(?: at| from| of)?(?: the| any)?(?: lists?)?(?: of)?(?: approved courses?)?(?: course lists?)?( following lists?| above| below)?(?: of courses)?(?: or subjects)?(?: lists?)?(?:; the {years} course can be taken from {lists()})?",
        [(1, 2, (-1,), (-1, 4), {})],
    ),
    (
        "0019DZ",
        rf"^(?:complete|choose) {count}(?: senior)? {courses}( seminars)?",
        [(1, -1, (-1,), coursesArray(2) + (13,), {})],
    ),
    (
        "0006DZ",
        rf"^(?:complete|choose) {count}(?: or \d)? (?:at|from|of)?(?: the| any)?([a-z]+ electives?(?: from {lists()})?)",
        [(1, -1, (-1,), (2,), {})],
    ),
    # (
    #     rf"^(?:complete|choose) {count} (course|unit)s? of ({course})( laboratory)? courses,?(?:(?: at| from| of)?(?: the| any)? {level})?",
    #     [(1, 2, levelArray(5), (3, 4), {})],
    # ),
]
