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
    "completed or concurrently enrolled in the following": ("all", "both"),
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
        r"^earned a minimum grade of (?:[0-9\.]*)% in (any|all|[0-9]) of the following",
        ("regex", "complete"),
    ),
    (
        r"^(?:must have )?complete(?:d)?(?: at least)? ([0-9]|all|any)(?: of)? the following",
        ("regex", "complete"),
    ),
    (
        r"^completed or concurrently enrolled in at least ([0-9]|all|any) of the following",
        ("regex", "both"),
    ),
    (r"^choose(?: at least)? ([0-9]|all|any) of the following", ("regex", "complete")),
    (
        r"^complete no more than ([0-9]) from the following",
        ("regex-less_than", "complete"),
    ),
]

count = r"(\d(?:\.\d)?|any)(?: additional)?"
courses = r"(?!additional\b)(\S+)" + r"(?:(?: and| or|, and|, or|,) (\S+))?" * 10
level = (
    r"(?:([0-9]00)-(?:,|, or| or) )?" * 3
    + r"(?:([0-9]00-|any )level)?(?:(?: or)? (below|above))?"
)
sourceBellowAbove = r"(?:(?: or)? from the(?: list of)? course(?:s)?(?: listed)?(?: or)? (below|above))?"
groupConditionRegExList: list[
    tuple[str, list[tuple[int, int, tuple[int], tuple[int]]]]
] = [
    # count, unit, levels, sources
    (
        rf"^complete {count} (course|unit)(?:s)? (?:at|from|of)(?: the| any)? {level}{sourceBellowAbove}[^a-zA-Z0-9]*$",
        [(1, 2, (3, 4, 5, 6, 7), (8,))],
    ),
    (
        rf"^complete {count} (?:at|from|of)?(?: the| any)?(\S+ electives?(?: from list [0-9a-zA-Z])?(?: or list [0-9a-zA-Z])?)[^a-zA-Z0-9]*$",
        [(1, -1, (-1,), (2,))],
    ),
    (
        rf"^complete {count} (course|unit)(?:s)? (?:at|from|of)(?: the| any)? {courses} course(?:s)?(?: at| from)?(?: the| any)? {level}{sourceBellowAbove}[^a-zA-Z0-9]*$",
        [(1, 2, (14, 15, 16, 17, 18), (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 19))],
    ),
    (
        rf"^complete {count} (course|unit)(?:s)? from the(?: list of)? course(?:s)?(?: listed)?(?: or)? (below|above)[^a-zA-Z0-9]*$",
        [(1, 2, (-1,), (3,))],
    ),
    (
        rf"^complete {count} {courses} (course|unit)(?:s)? (?:at|from|of)(?: the| any)? {level}{sourceBellowAbove}[^a-zA-Z0-9]*$",
        [(1, 13, (14, 15, 16, 17, 18), (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19))],
    ),
    (
        rf"^complete {count} (course|unit)(?:s)? (?:at|from|of)(?: the| any)? {level}(?: course(?:s)?)? from: {courses}[^a-zA-Z0-9]*$",
        [(1, 2, (3, 4, 5, 6, 7), (8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18))],
    ),
    (
        rf"^complete {count}(?:(?!additional\b) \S+)? (course|unit)(?:s)? (?:at|from|of)(?: the| any)?(?: following)?(?: \S*)? subject codes: {courses}[^a-zA-Z0-9]*$",
        [(1, 2, (-1,), (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13))],
    ),
    (
        rf"^complete {count} (course|unit)(?:s)? (?:at|from|of)(?: the| any)?(?: language)? courses from the approved (courses list)(?: below)?[,\.\s\-_](?: see additional constraints)?[^a-zA-Z0-9]*$",
        [(1, 2, (-1,), (3,))],
    ),
    (
        rf"^complete {count} {courses} (course|unit)(?:s)?[^a-zA-Z0-9]*$",
        [(1, 13, (-1,), (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12))],
    ),
    (
        rf"^complete {count} (course|unit)(?:s)? of {courses} courses (?:at|from|of)(?: the| any)? {level}[,\.\s\-_] {count} (course|unit)(?:s)? of which must be (?:at|from|of)(?: the| any)? {level}[^a-zA-Z0-9]*$",
        [
            (1, 2, (14, 15, 16, 17, 18), (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)),
            (19, 20, (21, 22, 23, 24, 25), (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)),
        ],
    ),
]


def numberTranslator(matched_regex: str, infoInstance: InfoClass):
    matched_regex = matched_regex.strip().lower()

    if matched_regex == "all":
        return "all"

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

    try:
        num = int(matched_regex) if matched_regex != "any" else 1
        return number_words.get(num, "error139")
    except ValueError:
        infoInstance.add(
            "differentErrors",
            f"120: error occured in numberTranslator for {infoInstance.id}-{matched_regex}",
        )
        return "error139"


def safe_find_element(element: WebElement, by, value):
    try:
        return element.find_element(by, value)
    except:
        return None


def process_source(source: str):
    return (
        source.replace("electives", "elective")
        .replace(" from list", "-list")
        .replace(" or list", "-list")
    )


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
                        + numberTranslator(matched.group(1), infoInstance),
                        condition[1],
                    )
                break
    if len(found) > 0:
        return "onStatus", found, paylaod

    for regex, conditions in groupConditionRegExList:
        matched = re.split(regex, conditionText, flags=re.IGNORECASE)
        if len(matched) > 1:
            res = []
            for count, unit, levels, sources in conditions:
                levels = [
                    matched[level].replace("-", "").strip() if level != -1 else "any"
                    for level in levels
                    if matched[level] is not None
                ]
                res.append(
                    {
                        "count": float(matched[count])
                        if matched[count] != "any"
                        else 1.0,
                        "unit": matched[unit] if unit != -1 else "course",
                        "levels": [
                            int(level)
                            if level != "any" and level != "above" and level != "bellow"
                            else level
                            for level in levels
                        ],
                        "additional": "additional" in conditionText,
                        "sources": [
                            process_source(matched[source])
                            for source in sources
                            if matched[source] is not None
                        ],
                    }
                )
            return ("grouped", re.match(regex, conditionText).group(0), res)
    return "none", "", ()


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
        infoInstance.add(
            "differentGroupedCondition",
            f"{conditionText.lower()}/-/{infoInstance.id}",
            payload,
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
                    count = count * (1 if payload[0]["unit"] == "course" else 2)
                currRes["conditionedOn"] = numberTranslator(count, infoInstance)
                currRes["conditionStatus"] = "complete"
                currRes["groupConditions"] = payload
                infoInstance.add(
                    "differentGroupedCondition", conditionText.lower(), payload
                )
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
    ListInfo: {
        conditionedOn: 'all' | 'any' | 'two'-'nine' | 'not_any' | 'final' | 'unclassified',
        conditionStatus: 'complete' | 'currently_enrolled' | 'both' | 'none',
        conditionText: str,
        appliesTo: ListInfo[],
        groupConditions?: {
            count: float;
            unit: 'unit' | 'course';
            additional: bool
            levels: [100|200|300|400|500|"any"|"above"|"below"];
            sources: [courseCode|"above"|"below"|"courses list"|"\\S+ elective"|"\\S+ elective-list 1-list 2 ..."]
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
                count = count * (1 if payload[0]["unit"] == "course" else 2)
            res["conditionedOn"] = numberTranslator(count, infoInstance)
            res["conditionStatus"] = "complete"
            res["groupConditions"] = payload
            infoInstance.add("differentGroupedCondition", sectionHeader, payload)
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
