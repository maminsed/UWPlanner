import json
import re
import time

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


"""
NOTE:
- additional conditionText: The following antirequisites are only for students in the Faculty of Mathematics: commst228

"""
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
    # "must have completed 1 of the following": ("any", "complete"),
    "choose any of the following": ("any", "complete"),
    # "must have completed at least 1 of the following": ("any", "complete"),
    # "complete 1 of the following": ("any", "complete"),
    # "completed or concurrently enrolled in at least 1 of the following": (
    #     "any",
    #     "both",
    # ),
    "must have completed": ("all", "complete"),
    "must have completed the following": ("all", "complete"),
    # "must have completed at least 2 of the following": ("two", "complete"),
    # "must have completed at least 3 of the following": ("three", "complete"),
    # "must have completed at least 4 of the following": ("four", "complete"),
    "complete all of the following": ("all", "complete"),
    "completed or concurrently enrolled in the following": ("all", "both"),
    "completed or concurrently enrolled in": ("all", "both"),
}

conditionRegExList: list[tuple[str, tuple[str, str]]] = [
    (
        r"^earned a minimum grade of ([0-9]*)% in each of the following",
        ("all", "complete"),
    ),
    (
        r"^earned a minimum grade of ([0-9]*)% in any of the following",
        ("any", "complete"),
    ),
    (
        r"^earned a minimum grade of ([0-9]*)% in at least 1 of the following",
        ("any", "complete"),
    ),
    (r"^must have completed ([0-9]|all|any) of the following", ("regex", "complete")),
    (
        r"^must have completed at least ([0-9]|all|any) of the following",
        ("regex", "complete"),
    ),
    (r"^complete ([0-9]|all|any) of the following", ("regex", "complete")),
    (r"^complete ([0-9]|all|any) the following", ("regex", "complete")),
    (
        r"^completed or concurrently enrolled in at least ([0-9]|all|any) of the following",
        ("regex", "both"),
    ),
    (r"^choose ([0-9]|all|any) of the following", ("regex", "complete")),
    (r"^choose at least ([0-9]|all|any) of the following", ("regex", "complete")),
    (
        r"^complete ([0-9]|any) additional course at the (([0-9]00)- or )?([0-9]00)-level( or from the courses listed below)?",
        ("regex", "complete"),
    ),
    (
        r"^complete ([0-9]|any) additional (.*) courses at the ([0-9]00)-level",
        ("regex", "complete"),
    ),
    (
        r"^complete ([0-9]|any) additional courses from any (.*) course at the (([0-9]00)- or )?([0-9]00)-level( or from the courses listed below)?",
        ("regex", "complete"),
    ),
]


def numberTranslator(matched_regex: str, id: str, infoDictionary: dict):
    matchedNum = 0
    if matched_regex == "all":
        return "all"
    elif matched_regex == "any":
        matchedNum = 1
    else:
        try:
            matchedNum = int(matched_regex)
        except Exception:
            print(f"120: error occured in numberTranslator for {id}-{matched_regex}")
            infoDictionary["differentErrors"].append(
                f"ATTENTION:ATTENTION:ERROR:120: error occured in numberTranslator for {id}-{matched_regex}"
            )
    lst = [
        "error139",
        "any",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
    ]

    return lst[matchedNum]


def safe_find_element(element: WebElement, by, value):
    try:
        return element.find_element(by, value)
    except:
        return None


def extract_condition_onStatus(
    conditionText: str, id: str, infoDictionary: dict, strict: bool = False
):
    """Returns: tuple(found,matchedText,onStatus)
    found: boolean,
    matchedText:str,
    onStatus: (conditionedOn, conditionedStatus),
    """
    conditionText = conditionText.lower()
    found = ""
    onStatus = ()
    if not strict:
        for key in conditionDict.keys():
            if conditionText.lower().startswith(key) and len(key) > len(found):
                found = key
                onStatus = conditionDict[key]
    elif conditionText.lower() in conditionDict:
        found = conditionText
        onStatus = conditionDict[conditionText.lower()]
    if not len(found):
        for regex, condition in conditionRegExList:
            matched = re.match(regex, conditionText.lower())
            if matched is not None:
                found = matched.group(0)
                onStatus = condition
                if onStatus[0] == "regex":
                    onStatus = (
                        numberTranslator(matched.group(1), id, infoDictionary),
                        found[1],
                    )
                break
    return len(found) > 0, found, onStatus


# TODO: remove courseCode, containerType + implement
def extract_non_ul_container_info(
    element: WebElement, courseCode: str, infoDictionary: dict
):
    res = {}
    conditionText = element.text.replace("\n", "").strip()
    found, matchedText, onStatus = extract_condition_onStatus(
        conditionText.lower(), courseCode, infoDictionary
    )

    # TODO: add a new type course-level which basically covers one ACTS course in 300 level.
    relatedLinks = []
    if found:
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
        res["conditionedOn"], res["conditionStatus"] = onStatus
        res["conditionText"] = matchedText
    else:
        res["conditionedOn"] = "final"
        res["conditionStatus"] = "none"
        res["conditionText"] = conditionText
        res["appliesTo"] = []

    links = element.find_elements(By.TAG_NAME, "a")
    for link in links:
        relatedLinks.append(getLinkAttr(link))
    if found:
        res["appliesTo"][0]["relatedLinks"] = relatedLinks
        res["relatedLinks"] = []
    else:
        if len(links) == 0:
            infoDictionary["differentConditionText"][conditionText] = courseCode
        res["relatedLinks"] = relatedLinks
    return res


# startpoint has to be the ul
def extractNested(
    startPoint: WebElement, courseCode: str, containerType: str, infoDictionary: dict
):
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
            infoDictionary["differentSectionTypes"][conditionText] = courseCode
            found, _, onStatus = extract_condition_onStatus(
                conditionText.lower(), f"{courseCode}-{containerType}", infoDictionary
            )
            if found:
                currRes["conditionedOn"], currRes["conditionStatus"] = onStatus
            else:
                currRes["conditionedOn"], currRes["conditionStatus"] = (
                    "unclassified",
                    "none",
                )
                print(
                    f"ATTENTION:ATTENTION:ERROR:{conditionText} not in conditionDict at {courseCode}-{containerType}"
                )
                infoDictionary["differentErrors"].append(
                    f"{conditionText} not in conditionDict at {courseCode}-{containerType}"
                )

            # extract members
            currRes["appliesTo"] = extractNested(
                members, courseCode, containerType, infoDictionary
            )
            currRes["relatedLinks"] = []
        # if it does not have an inner ul then it's
        else:
            currRes = extract_non_ul_container_info(
                listItem, courseCode, infoDictionary
            )
        res.append(currRes)
    if not len(listItems):
        print(
            f"ATTENTION:ATTENTION:ERROR:{courseCode}-{containerType} does not have any nested"
        )
        infoDictionary["differentErrors"].append(
            f"{courseCode}-{containerType} does not have any nested"
        )
    return res


# TODO:get rid of courseCode and upper
def extractContainerInfo(
    section: WebElement, courseCode: str, containerType: str, infoDictionary: dict
):
    # section has to be a top level ul
    """return:
    ListInfo: {
        conditionedOn: 'all' | 'any' | 'two' | 'three' | 'four' | 'not_all' | 'not_any' | 'final' | 'unclassified',
        conditionStatus: 'complete' | 'currently_enrolled' | 'both' | 'none'
        conditionText: str,
        appliesTo: ListInfo[]
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
            infoDictionary["differentSectionTypes"][sectionHeader] = courseCode
        except:
            pass

    # we get the inner ul
    nestedUl = safe_find_element(firstList, By.CSS_SELECTOR, ":scope > ul")

    # If we were successfull, we just find the children normally
    if nestedUl and sectionHeader:
        res["conditionText"] = sectionHeader
        if sectionHeader.lower() in conditionDict:
            res["conditionedOn"], res["conditionStatus"] = conditionDict[
                sectionHeader.lower()
            ]
        else:
            res["conditionedOn"], res["conditionStatus"] = "unclassified", "none"
            print(
                f"ATTENTION:ATTENTION:ERROR:{sectionHeader} not in conditionDict - {courseCode}"
            )
            infoDictionary["differentErrors"][
                f"{sectionHeader} not in conditionDict"
            ] = courseCode
        res["relatedLinks"] = []
        res["appliesTo"] = extractNested(
            nestedUl, courseCode, containerType, infoDictionary
        )
    # if we werent then we are one of the children
    else:
        results = extractNested(section, courseCode, containerType, infoDictionary)
        if len(results) == 0:
            results = extract_non_ul_container_info(
                section, courseCode, infoDictionary
            )  # TODO: test MSE121
        if len(results) == 1:
            res = results[0]
        else:
            res["conditionedOn"] = "unclassified"
            res["conditionStatus"] = "none"
            res["conditionText"] = ""
            res["appliesTo"] = results
            res["relatedLinks"] = []
            print(f"ATTENTION:ATTENTION:ERROR:{courseCode}-{containerType}-119")
            infoDictionary["differentErrors"].append(
                f"{courseCode}-{containerType}-119"
            )
    return res


def addGroupTodb(
    group_name: str,
    members: list[dict[str, str]],
    driver: WebDriver,
    infoDictionary: dict,
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
                infoDictionary["differentErrors"].append(f"course.code-{227}")
                continue
            header = header.text.lower()
            # checking for cross-listed

            if header not in searchingHeaders:
                infoDictionary["differentHeaders"][header] = course.code
                continue
            container = safe_find_element(
                section, By.CSS_SELECTOR, sectionTextContainerCSS
            )
            if not container:
                infoDictionary["differentErrors"].append(f"{course.code}-239")
                continue

            if header == "cross-listed courses":
                links = container.find_elements(By.TAG_NAME, "a")
                courseInfo[header] = [getLinkAttr(l) for l in links]
                continue
            counter += 1
            listVersion = safe_find_element(container, By.CSS_SELECTOR, sectionsTextCSS)

            if listVersion:
                print("list found")
                course_json = extractContainerInfo(
                    listVersion, course.code, header, infoDictionary
                )
            else:
                print("list not found")
                course_json = extract_non_ul_container_info(
                    container, course.code, infoDictionary
                )
            courseInfo[header] = course_json
        # Adding course information to db
        # differentCourseJsons[course.code] = courseInfo
        courseInfo = json.dumps(courseInfo)
        infoDictionary["total"] += 1
        if courseInfo != course.courseInfo:
            infoDictionary["differentUpdated"].append(course.code)
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
    infoDictionary = {
        "differentSectionTypes": {},
        "differentConditionText": {},
        "differntHeaders": {},
        "differentErrors": [],
        # "differentCourseJsons": differentCourseJsons,
        "differentUpdated": [],
        # "_info": f"updated: {len(differentUpdated)} of {total} courses",
        "total": 0,
    }

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
                infoDictionary,
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
        infoDictionary["i"] = i + offset
        infoDictionary["groups"] = groups
        infoDictionary["_info"] = (
            f"updated: {len(infoDictionary['differentUpdated'])} of {infoDictionary['total']} courses"
        )
        return infoDictionary
