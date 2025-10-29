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
    urlPrefix = "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/"
    linkType = "external"
    if url.startswith(urlPrefix):
        typeEndIndex = url.find("/", len(urlPrefix))
        linkType = url[len(urlPrefix) : typeEndIndex]
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
    "not completed": ("not_any", "complete"),
    "must have completed 1 of the following": ("any", "complete"),
    "must have completed at least 1 of the following": ("any", "complete"),
    "complete 1 of the following": ("any", "complete"),
    "completed or concurrently enrolled in at least 1 of the following": (
        "any",
        "both",
    ),
    "must have completed the following": ("all", "complete"),
    "must have completed at least 2 of the following": ("two", "complete"),
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
]


def safe_find_element(element: WebElement, by, value):
    try:
        return element.find_element(by, value)
    except:
        return None


# TODO: remove courseCode, containerType + implement
def extract_non_ul_container_info(element: WebElement, courseCode: str):
    res = {}
    conditionText = element.text.replace("\n", "").strip()
    found = ""
    for key in conditionDict.keys():
        if conditionText.lower().startswith(key) and len(key) > len(found):
            found = key

    relatedLinks = []
    if len(found) > 0:
        newConditionText = (
            conditionText[len(found) :].replace(":", "").replace("\n", "").strip()
        )
        relatedLinks = [
            {"value": r.strip(), "url": "", "linkType": "course"}
            for r in re.sub(r"[.,!?><\\/]", "", newConditionText).split(" ")
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
        res["conditionedOn"], res["conditionStatus"] = conditionDict[found]
        res["conditionText"] = found
    else:
        res["conditionedOn"] = "final"
        res["conditionStatus"] = "none"
        differentConditionText[conditionText] = courseCode
        res["conditionText"] = conditionText
        res["appliesTo"] = []

    links = element.find_elements(By.TAG_NAME, "a")
    for link in links:
        relatedLinks.append(getLinkAttr(link))
    if len(found) > 0:
        res["appliesTo"][0]["relatedLinks"] = relatedLinks
        res["relatedLinks"] = []
    else:
        res["relatedLinks"] = relatedLinks
    return res


def extractNested(startPoint: WebElement, courseCode: str, containerType: str):
    listItemsCSS = ":scope > li"

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
            differentSectionTypes[conditionText] = courseCode
            found = []
            for regex, condition in conditionRegExList:
                if re.match(regex, conditionText.lower()):
                    found = condition
                    break
            if len(found):
                currRes["conditionedOn"], currRes["conditionStatus"] = found
            elif conditionText.lower() in conditionDict:
                currRes["conditionedOn"], currRes["conditionStatus"] = conditionDict[
                    conditionText.lower()
                ]
            else:
                currRes["conditionedOn"], currRes["conditionStatus"] = (
                    "unclassified",
                    "none",
                )
                differentErrors.append(
                    f"{conditionText} not in conditionDict at {courseCode}-{containerType}"
                )

            # extract members
            currRes["appliesTo"] = extractNested(members, courseCode, containerType)
            currRes["relatedLinks"] = []
        # if it does not have an inner ul then it's
        else:
            currRes = extract_non_ul_container_info(listItem, courseCode)
        res.append(currRes)
    return res


# TODO:get rid of courseCode and upper
def extractContainerInfo(section: WebElement, courseCode: str, containerType: str):
    # section has to be a top level ul
    """return:
    ListInfo: {
        containerType: str #only if it's first level and e.g. Prerequisite
        conditionedOn: 'all' | 'any' | 'two' | 'not_all' | 'not_any' | 'final' | 'unclassified',
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
            differentSectionTypes[sectionHeader] = courseCode
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
            differentErrors[f"{sectionHeader} not in conditionDict"] = courseCode
        res["relatedLinks"] = []
        res["appliesTo"] = extractNested(nestedUl, courseCode, containerType)
    # if we werent then we are one of the children
    else:
        results = extractNested(section, courseCode, containerType)
        if len(results) == 1:
            res = results[0]
        else:
            res["conditionedOn"] = "unclassified"
            res["conditionStatus"] = "none"
            res["conditionText"] = ""
            res["appliesTo"] = results
            res["relatedLinks"] = []
            differentErrors.append(f"{courseCode}-{containerType}-119")
    return res


# TODO: remove
differentSectionTypes = {}
differentHeaders = {}
differentErrors = []
differentConditionText = {}


def addGroupTodb(group_name: str, members: list[dict[str, str]], driver: WebDriver):
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
                differentErrors.append(f"course.code-{227}")
                continue
            header = header.text.lower()
            # checking for cross-listed

            if header not in searchingHeaders:
                differentHeaders[header] = course.code
                continue
            container = safe_find_element(
                section, By.CSS_SELECTOR, sectionTextContainerCSS
            )
            if not container:
                differentErrors.append(f"{course.code}-239")
                continue

            if header == "cross-listed courses":
                links = container.find_elements(By.TAG_NAME, "a")
                courseInfo[header] = [getLinkAttr(l) for l in links]
                continue

            listVersion = safe_find_element(container, By.CSS_SELECTOR, sectionsTextCSS)

            if listVersion:
                print("list found")
                course_json = extractContainerInfo(listVersion, course.code, header)
            else:
                print("list not found")
                course_json = extract_non_ul_container_info(container, course.code)
            courseInfo[header] = course_json
        # Adding course information to db
        course.courseInfo = json.dumps(courseInfo)
        course.url = curr["url"]
        course.groupName = group_name
        course.groupCode = group_code
        db.session.add(course)
        db.session.flush()

        driver.close()
        driver.switch_to.window(main_window)
    db.session.commit()


def get_course_reqs():
    classGroupCSS = 'div[class*="style__collapsibleBox___"]'
    expandButtonCSS = 'h2[class*="style__title___"]'
    linkContainerCSS = 'div[class*="style__columns___"]'

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.get(
        "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses"
    )
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
    print(f"Hi, were starting with {len(classGroups)} cgs")
    offset = 50
    limit = 25
    i = 0
    groups = {}
    try:
        while i < min(limit, len(classGroupCSS)):
            cg = classGroups[offset + i]
            i += 1
            updateGroup = {}
            # expandButton = WebDriverWait(cg, delayAmount).until(
            #     EC.element_to_be_clickable((By.CSS_SELECTOR, expandButtonCSS))
            # )
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
            addGroupTodb(updateGroup["group_name"], updateGroup["members"], driver)
            # waiting for it to actualy close
            try:
                expandGroup = cg.find_element(
                    By.CSS_SELECTOR, "div.ReactCollapse--collapse"
                )
                WebDriverWait(cg, delayAmount).until(EC.staleness_of(expandGroup))
            except Exception:
                pass
            groups[group_name] = "close"
    except Exception as e:
        print(e)
        print("error occured")
    finally:
        if driver:
            driver.quit()
        return {
            "groups": groups,
            "differentSectionTypes": differentSectionTypes,
            "differentConditionText": differentConditionText,
            "differntHeaders": differentHeaders,
            "differentErrors": differentErrors,
            "i": i + offset,
        }
