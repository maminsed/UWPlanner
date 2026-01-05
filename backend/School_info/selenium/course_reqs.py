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

from .constants import (
    CONSTANT_URLS,
    conditionDict,
    conditionRegExList,
    countingYears,
    courses,
    coursesArray,
    end,
    groupConditionRegExList,
    number_words,
)
from .extraction_utils import InfoClass

delayAmount = 15


def bring_into_view(driver: WebDriver, element: WebElement):
    driver.execute_script(
        "window.scrollTo({top: arguments[0].getBoundingClientRect().top + window.pageYOffset + 4, behavior: 'instant' });",  # , behavior: 'smooth'  # "arguments[0].scrollIntoView({block:'start'});",
        element,
    )
    time.sleep(1)


def get_link_attr(link: WebElement):
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


def safe_find_element(element: WebElement, by, value: str):
    try:
        return element.find_element(by, value)
    except:
        return None


def string_to_english(matched_regex: str, infoInstance: InfoClass) -> str:
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
            f"120: error occured in string_to_english for {infoInstance.id}-{matched_regex}",
        )
        return "error139"


def string_to_float(str_num: str) -> float:
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


def extract_gc_takenIn(rawInput: None | tuple[int], splitedRegex: list[str | None]):
    if rawInput is None:
        return None
    res = []
    for idx in rawInput:
        if splitedRegex[idx] is None:
            continue
        res.append(int(string_to_float(splitedRegex[idx])))
    return res


def extract_gc_subjectCodesCondition(
    rawInput: None | tuple[int, int | str],
    splitedRegex: list[str | None],
    infoInstance: InfoClass,
):
    # rawInput:(limit,status)
    if rawInput is None:
        return None
    limit, status = rawInput
    limit = (splitedRegex[limit] or "").strip()
    if type(status) == int:
        status = (splitedRegex[status] or "").strip()
    if limit == "" and status == "":
        return None
    if limit == "one" or limit == "all" or not limit:
        limit = "any"
    statusMap = {
        "at least": "gt",
        "minimum": "gt",
        "maximum": "lt",
        "at most": "lt",
        "all from": "eq",
        "only": "eq",
        "same": "eq",
        "eq": "eq",
    }

    if not status or status is None or status not in statusMap:
        infoInstance.add(
            "differentErrors", f"{rawInput} at {splitedRegex} has status: '{status}'"
        )
        return None

    return {"status": statusMap[status], "limit": limit}


def extract_gc_excluding(
    conditionTextLower: str,
    preset_matches: tuple[int] | None,
    matched: list[str | None],
    infoInstance: InfoClass,
) -> list[str]:
    if preset_matches is not None:
        excludes = extract_gc_sources(matched, preset_matches, infoInstance)
        if len(excludes):
            return excludes
    phrase = rf"\((?:excluding|exclusive)(?: of)? {courses}\)"
    matched = re.split(phrase, conditionTextLower)
    if len(matched) > 1:
        return extract_gc_sources(matched, coursesArray(1), infoInstance)
    else:
        return []


def extract_gc_sources(
    regexMatches: list[str | None], sourceIndecies: list[int], infoInstance: InfoClass
):
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
        if re.match(
            r"(following (list|courses?|options?)|list of (courses|options)|this list)",
            source,
        ):
            source = "below"
        elif source == "following lists":
            source = "course lists"
        elif re.match(
            r"^[a-z]{1,8} [0-9]{3}[a-z]?(?: ?- ?[a-z]{,8} [0-9]{3}[a-z]?)?$", source
        ):
            source = source.replace(" ", "")  # e.g. cs 120
        elif re.match(r"list of [a-z]* courses?", source):
            source = (
                source.replace("list of ", "").replace("courses", "course") + " list"
            )
        if (
            len(source) == 1
            and len(processedSources) >= 1
            and processedSources[-1].startswith("list")
        ):
            source = "list " + source
        if len(source) == 1:
            infoInstance.add(
                "differentWarnings",
                f"'{source}' at {infoInstance.id} has lenght one. ConditionText: '{infoInstance.get('conditionText')}', matchedId: '{infoInstance.get('matchedId')}'",
            )
            continue
        elif len(source) > 18:
            infoInstance.add(
                "differentWarnings",
                f"'{source}' at {infoInstance.id} is too long: {len(source)}",
            )
        processedSources.append(source)
    if hasNegOne and len(processedSources) == 0:
        return ["any"]
    return processedSources


def extract_gc_levels(condition_text, infoInstance, matched, level_indices):
    result_levels = []
    has_any_level = False
    for level_idx in level_indices:
        if level_idx == -1:
            has_any_level = True
            continue
        level: str | None = matched[level_idx]
        if level is None:
            continue
        level = level.replace("-", "").strip()
        aboveList = ["higher", "greater", "above"]
        if level == "any level":
            level = "any"
        if level == "any" or level == "below" or level in aboveList:
            result_levels.append(level if level not in aboveList else "above")
        else:
            try:
                result_levels.append(int(level))
            except ValueError:
                infoInstance.add(
                    "differentErrors",
                    f"{condition_text}-{level} is not a valid level",
                )
    if has_any_level and not len(result_levels):
        result_levels.append("any")
    return result_levels


def extract_gc_cap(
    cap_value: int | str | None, condition_text: str, matched, infoInstance: InfoClass
):
    cap_mapping = {
        "no more than": "max",
        "no more": "max",
        "max": "max",
        "minimum": "min",
        "maximum": "max",
        "at least": "min",
        "at most": "max",
        "min": "min",
        "at least": "min",
        "at most": "max",
    }
    if cap_value is not None:
        if type(cap_value) == int:
            cap_value = (matched[cap_value] or "").strip()
        if cap_value == "":
            return None
        if cap_value in cap_mapping:
            cap_value = cap_mapping[cap_value]
        elif cap_value != "":
            infoInstance.add(
                "differentErrors",
                f"{condition_text} is supposed to have cap but it actually has: {cap_value}",
            )
            cap_value = None
    return cap_value


def extract_gc_additional(
    conditionText: str,
    config: bool | int | None,
    matched: list[str | None],
    infoInstance: InfoClass,
):
    if config is not None:
        if type(config) == bool:
            return config
        res = matched[config]
        if res is None:
            return False
        return res in ["additional", "remaining", "extra"]
    conditionText = conditionText.lower().replace("see additional constraint", "")
    return "additional" in conditionText


def extract_group_condition(
    condition_text: str,
    infoInstance: InfoClass,
    matched: list[str | None],
    conditions: list[tuple[int, int, tuple[int], tuple[int], dict[str]]],
):
    result = []
    for (
        count_idx,
        unit_idx,
        level_indices,
        source_indices,
        additional_config,
    ) in conditions:
        result_count = 1.0 if count_idx == -1 else string_to_float(matched[count_idx])
        result_unit = matched[unit_idx] if unit_idx != -1 else "course"
        if count_idx == -1:
            result_unit = "full source"

        curr_result = {
            "count": result_count,
            "unit": result_unit,
            "levels": extract_gc_levels(
                condition_text, infoInstance, matched, level_indices
            ),
            "additional": extract_gc_additional(
                condition_text,
                additional_config.get("additional", None),
                matched,
                infoInstance,
            ),
            "sources": extract_gc_sources(matched, source_indices, infoInstance),
            "subjectCodesCondition": extract_gc_subjectCodesCondition(
                additional_config.get("subjectCodesCondition", None),
                matched,
                infoInstance,
            ),
            "takenIn": extract_gc_takenIn(
                additional_config.get("takenIn", None), matched
            ),
            "cap": extract_gc_cap(
                additional_config.get("cap", None),
                condition_text,
                matched,
                infoInstance,
            ),
            "excluding": extract_gc_excluding(
                condition_text.lower(),
                additional_config.get("excluding", None),
                matched,
                infoInstance,
            ),
        }
        curr_result = {k: v for k, v in curr_result.items() if v is not None}
        if additional_config.get("extra", False) and (
            not len(curr_result["levels"]) or not len(curr_result["sources"])
        ):
            continue
        result.append(curr_result)

    return result


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
                        + string_to_english(matched.group(1), infoInstance),
                        condition[1],
                    )
                break
    if len(found) > 0:
        return "onStatus", found, paylaod

    infoInstance.setEnvVar("conditionText", conditionText)
    for id, regex, conditions in groupConditionRegExList:
        matched = re.split(rf"{regex}{end}", conditionText, flags=re.IGNORECASE)
        if len(matched) > 1:
            infoInstance.setEnvVar("matchedId", id)
            res = extract_group_condition(
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
            res = extract_group_condition(
                conditionText, infoInstance, matched, conditions
            )
            infoInstance.add(
                "carefullGroupedCondition",
                conditionText.lower(),
                [id, infoInstance.id] + res,
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
        res["appliesTo"] = []
        if newConditionText != "":
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
    elif found == "grouped":
        res["conditionedOn"] = "final"
        res["conditionStatus"] = "complete"
        res["conditionText"] = conditionText
        res["groupConditions"] = payload
        res["appliesTo"] = []
        if any(
            not groupCondition["levels"] or not groupCondition["sources"]
            for groupCondition in payload
        ) or not len(payload):
            infoInstance.add(
                "differentErrors",
                f"267: {conditionText.lower()}-{infoInstance.id} levels or sources is empty",
            )
    elif found == "none":
        res["conditionedOn"] = "final"
        res["conditionStatus"] = "none"
        res["conditionText"] = conditionText
        res["appliesTo"] = []

    links = element.find_elements(By.TAG_NAME, "a")
    for link in links:
        relatedLinks.append(get_link_attr(link))
    if found == "onStatus" and len(res["appliesTo"]):
        res["appliesTo"][0]["relatedLinks"] = relatedLinks
        res["relatedLinks"] = []
    else:
        if len(links) == 0 and found == "none":
            infoInstance.add("differentConditionText", conditionText, infoInstance.id)
            print(f"conditionText: {conditionText}")
        res["relatedLinks"] = relatedLinks
    return res


# startpoint has to be the ul
def extract_nested(startPoint: WebElement, infoInstance: InfoClass):
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
                currRes["conditionedOn"] = string_to_english(count, infoInstance)
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
            currRes["appliesTo"] = extract_nested(members, infoInstance)
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
    """Function to extract Container Information
    decimalCount: "any" | "two" - "nine"
    return:
        ListInfo: {
            conditionedOn: 'all' | decimalCount | 'not_any' | 'final' | 'unclassified',
            conditionStatus: 'complete' | 'currently_enrolled' | 'both' | 'none',
            conditionText: str,
            appliesTo: ListInfo[],
            groupConditions?: {
                count: float;
                unit: 'unit' | 'course' | 'full source'; #full source means whatever from above came..? (or from bellow)
                levels: [100|200|300|400|500|"any"|"above"|"below"|"higher"];
                sources: [courseCode|"above"|"below"|"courses list"|"\\S+ elective"|"\\S+ elective-list 1-list 2&list 3 ..."|"any"];
                additional?: bool;
                subjectCodesCondition?: {
                    limit: 'all' | decimalCount;
                    status: 'lt'|'gt'|'eq':
                    # EX: {limit: 1, status: lt}: at most 1 different subject code
                };
                takenIn?: int[]
                cap?: "max"|"min"|"exact"
                excluding?: courseCode[]
            }[]
            relatedLinks: {value: str, url: str, linkType: 'programs'|'course'|'external'}[]
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
            res["conditionedOn"] = string_to_english(count, infoInstance)
            res["conditionStatus"] = "complete"
            res["groupConditions"] = payload
        else:
            res["conditionedOn"], res["conditionStatus"] = "unclassified", "none"
            infoInstance.add(
                "differentErrors",
                f"{sectionHeader} not in conditionDict-{infoInstance.id}",
            )
        res["relatedLinks"] = []
        res["appliesTo"] = extract_nested(nestedUl, infoInstance)
    # if we werent then we are one of the children
    else:
        results = extract_nested(section, infoInstance)
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
                courseInfo[header] = [get_link_attr(l) for l in links]
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

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.get(CONSTANT_URLS["UNDERGRAD"]["COURSES"])
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
            bring_into_view(driver, expandButton)

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
