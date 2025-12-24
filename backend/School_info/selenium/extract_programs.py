import re
import time
import traceback
from typing import Literal

from markdownify import markdownify as md
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

from .calendar_utils import InfoClass
from .constants import count
from .course_reqs import extractContainerInfo, get_link_attr, safe_find_element

delayAmount = 15
# differentPrograms = []
# differentErrors = []
processedSectionTypes = {
    "Additional Constraints": "Diploma in Fundamentals of Anti-Racist Communication",  # Requirements
    "Admission Requirements: Minimum Requirements": "Accounting and Financial Management (Bachelor of Accounting and Financial Management - Honours)",  # Requirements
    "Co-operative Education Program Requirements": "Anthropology (Bachelor of Arts - Honours)",  # Should only be the line: "For students in the co-operative system of study, see <link>." unless it's a degree then it's highkey wilding
    "Course Requirements": "Diploma in Fundamentals of Anti-Racist Communication",  # Requirements
    "Course Lists": "Finance Specialization",  # Requirements (it might have both this and above)
    "Degree Requirements": "Bachelor of Science Degree Requirements (Science)",  # Requirements
    "Declaration Requirements": "Addictions, Mental Health, and Policy Minor",  # Requirements
    "Graduation Requirements": "Diploma in Fundamentals of Anti-Racist Communication",  # Requirements
    "Minimum Average(s) Required": "Diploma in Fundamentals of Anti-Racist Communication",  # Requirements
    "Online Degree/Diploma": "Mathematics/Financial Analysis and Risk Management - Professional Risk Management Specialization (Bachelor of Mathematics - Honours)",  # ignore
    "Notes": "Diploma in Fundamentals of Anti-Racist Communication",  # linkedUrls
    "Offered by Faculty(ies)": "Diploma in Fundamentals of Anti-Racist Communication",  # offeredByFaculties #TODO: 3
    "Specializations": "Actuarial Science (Bachelor of Mathematics - Honours)",  # Specializations
    "Specializations List": "Actuarial Science (Bachelor of Mathematics - Honours)",  # Specializations
    "Systems of Study": "Anthropology (Bachelor of Arts - Three-Year General)",  # systemsOfStudy
    "Student Audience": "Diploma in Fundamentals of Anti-Racist Communication",  # availableTo
    "This option is available for students in the following degrees": "Quantum Information Option",  # availableTo
    "This specialization is available for students in the following majors": "Predictive Analytics Specialization",  # availableTo
}
# differentSectionTypes = {}

"""
    Requirements:
        - Course Requirements?: {
            overall?: ListInfo
            [1-5][AB]?: ListInfo
        }
        - Degree Requirements: only for degrees
        - Graduation Requirements
        - Admission Requirements
        - Decleration Requirements
        - Minimum Averages Required
        - Additional Constraints
    Specializations?: {
        numAllowed: int,
        specializationList: {
            label: str,
            url: str,
        }[]
    }
    systemsOfStudy: "regular" || "coop" || "both"
    offeredByFaculties: str[]
    groupName: str
    linkedUrls: {label: str, url: str}[]
    availableTo: {
        type: typeof program_type_map.keys() || "general",
        name: str, #if it's general then: "any degree" || "any postdoc" || "any masters" || "non post-degree" || "post-degree"
        url: str,
    }[]

"""
"""
RequirementType: {
    name: str;
    type: "cl"||"cr";
    requirement: ListInfo;
    innerLists: str[];
}
"""

program_type_map = [
    ["diploma", "diploma"],
    ["certificate", "certificate"],
    ["degree requirements", "degree"],
    ["joint honour", "joint major"],
    ["joint major", "joint major"],
    ["joint bachelor", "joint major"],
    ["double degree", "double degree"],
    ["specialization", "specialization"],
    ["option", "option"],
    ["minor", "minor"],
    ["bachelor", "major"],
    ["honours", "major"],
    ["major", "major"],
    ["arts and business", "major"],  # ?
    ["phd", "phd"],
    ["doctor", "doctorate"],
    ["masters", "masters"],
]


def bringIntoView(driver: WebDriver, element: WebElement):
    driver.execute_script(
        "window.scrollTo({top: arguments[0].getBoundingClientRect().top + window.pageYOffset + 4, behavior: 'instant' });",  # , behavior: 'smooth'  # "arguments[0].scrollIntoView({block:'start'});",
        element,
    )
    time.sleep(1)


def find_program_type(programName: str, infoInstance: InfoClass):
    programName = programName.lower()
    # weird cases
    # if programName.startswith("mathematical optimization"):
    #     return "major"

    for keyword, programType in program_type_map:
        if keyword in programName:
            return programType
    infoInstance.add("differentErrors", f"60: {programName} does not have any types")
    return "none"


def extract_markdown(section: WebElement):
    # First, fix all anchor tags to use their actual href attributes
    links = section.find_elements(By.TAG_NAME, "a")
    driver = section.parent

    for link in links:
        actual_href = link.get_attribute("href")
        if actual_href:
            driver.execute_script(
                "arguments[0].setAttribute('href', arguments[1]);", link, actual_href
            )

    html = section.get_attribute("innerHTML") or ""
    return md(html, heading_style="ATX", strip=["style", "script"])


def extract_availableTo(sectionEls: dict[str, WebElement], infoInstance: InfoClass):
    """Returns: {
        "name": str;
        "markdown": str;
        "relatedLinks": {"value": str|'any'|'any_degree',"url": str,"linkType": 'programs'|'course'|'external'}[]
    }
    """
    innerTextCSS = 'div[class*="program-view__pre___"]'
    result = []
    for key, sectionEl in sectionEls.items():
        current_result = {"relatedLinks": []}
        innerEl = safe_find_element(sectionEl, By.CSS_SELECTOR, innerTextCSS)
        if not innerEl:
            infoInstance.add(
                "differentErrors", f"{infoInstance.id} has no innerEl for {key}"
            )
            continue
        if "specialization" in key.lower():
            links = sectionEl.find_elements(By.CSS_SELECTOR, "a")
            if len(links) == 0:
                infoInstance.add(
                    "differentErrors",
                    "there is no links found in extract_availableTo for specialization section",
                )
            for link in links:
                current_result["relatedLinks"].append(get_link_attr(link))
        elif "option" in key.lower():
            infoInstance.add(
                "differentErrors", f"this section is not done yet: {infoInstance.id}"
            )
            continue
        elif "Student Audience" == key:
            student_audience_regex = r"^this credential is open to students enrolled in(?: any)? degree programs?( or any non- or post-degree academic plan)?[^0-9a-z]*$"
            matched = re.split(student_audience_regex, innerEl.text.lower())
            if len(matched) > 1:
                current_result["relatedLinks"].append(
                    {
                        "value": "any" if matched[1] is not None else "any_degree",
                        "url": "",
                        "linkType": "external",
                    }
                )
            else:
                infoInstance.add(
                    "differentErrors",
                    f"{infoInstance.id}'s  text: {innerEl.text} does not match the student_audience_regex",
                )
        else:
            infoInstance.add(
                "differentErrors",
                f"{key} appeared in extract_availableTowhen it shouldn't have",
            )
            continue
        current_result["name"] = key
        current_result["markdown"] = extract_markdown(innerEl)
        result.append(current_result)
    if len(result) == 0 and len(sectionEls) != 0:
        infoInstance.add("differentWarnings", f"{infoInstance.id} has no availableTo")
    if len(result) != 0:
        infoInstance.add("differentAvailableTo", infoInstance.id, result)
    return result


def extract_specializations(sections: dict[str, WebElement], infoInstance: InfoClass):
    """Extracts specialization information from program sections.

    Args:
        sections: Dictionary mapping section names to WebElement objects
        infoInstance: InfoClass instance for tracking errors and warnings

    Returns:
        {
            "type": "programs"
            "specialization_text": str,
            "list_text": str,
            "at_least_one_required": boolean,
            "specialization_options": {"value": str,"url": str,"linkType": 'programs'|'course'|'external'}[]
        } || {
            "type": "course_req",
            "requirements": RequirementType[]
        } || None

    """
    if len(sections) == 0:
        return None

    if len(sections) > 2 or len(sections) < 1 or "Specializations" not in sections:
        infoInstance.add(
            "differentErrors",
            f"only has the following sections for '{infoInstance.id}' in extract-specializations, {list(sections.keys())}",
        )
        return None

    section_text_css = 'div[class*="program-view__pre___"]'
    links_css = "a"
    result = {}
    if "Specializations List" in sections:
        result["type"] = "programs"
        # Extract "Specializations" section text
        specialization_element = safe_find_element(
            sections["Specializations"], By.CSS_SELECTOR, section_text_css
        )
        result["at_least_one_required"] = False
        if specialization_element is None:
            result["specialization_text"] = ""
            infoInstance.add(
                "differentErrors",
                f"Missing text content in 'Specializations' section for {infoInstance.id}",
            )
        else:
            specialization_text = specialization_element.text
            result["specialization_text"] = specialization_text

            expected_pattern = rf"^students (may|must) (choose to focus their elective choices by completing|complete)( {count}( \(?or more\)?)? of)?( the)?( {count})? available specializations?( and may elect to complete a second)?[^0-9a-z]*$"
            if not re.match(expected_pattern, specialization_text.lower()):
                infoInstance.add(
                    "differentWarnings",
                    f"Specialization text format differs from expected pattern for {infoInstance.id}: "
                    f"'{specialization_text}'",
                )
            if specialization_text.lower().startswith("students must"):
                result["at_least_one_required"] = True
            elif not specialization_text.lower().startswith("students may"):
                infoInstance.add(
                    "differentErrors",
                    f"{infoInstance.id}'s 'Specialization Text' does not start with may or must: '"
                    f"{specialization_text}'",
                )

        # Extract "Specializations List" section
        specialization_list_element = safe_find_element(
            sections["Specializations List"], By.CSS_SELECTOR, section_text_css
        )
        result["specialization_options"] = []
        result["list_text"] = ""

        if specialization_list_element is None:
            infoInstance.add(
                "differentErrors",
                f"Missing text content in 'Specializations List' section for {infoInstance.id}",
            )
        else:
            result["list_text"] = extract_markdown(specialization_list_element)
            links = specialization_list_element.find_elements(
                By.CSS_SELECTOR, links_css
            )

            if len(links) == 0:
                infoInstance.add(
                    "differentErrors",
                    f"No links found in 'Specializations List' section for {infoInstance.id}",
                )

            for link in links:
                link_attributes = get_link_attr(link)
                result["specialization_options"].append(link_attributes)

                if link_attributes["linkType"] != "programs":
                    infoInstance.add(
                        "differentErrors",
                        f"Non-program link found in 'Specializations List' for {infoInstance.id}: "
                        f"'{link_attributes['url']}' (type: {link_attributes['linkType']})",
                    )
    else:
        result["type"] = "course_req"
        result["requirements"] = extract_course_lists(
            sections["Specializations"], infoInstance, "cr"
        )
    infoInstance.add("differentSpecializations", infoInstance.id, result)
    return result


def extract_course_lists(
    sectionEl: WebElement, infoInstance: InfoClass, type: Literal["cl", "cr"] = "cl"
):
    """For now SectionEl has to be as outer as possible. (within the section obv)

    Returns: RequirementType[]
    """
    # innerSectionCSS = ":scope section:not(:scope section section)"
    biggestulCSS = ":scope ul:not(:scope ul ul)"
    course_lists = []

    def find_header(sectionEl: WebElement):
        headerCSS = 'div[class*="style__itemHeaderH2"]'
        header = sectionEl.find_element(By.CSS_SELECTOR, headerCSS).text
        return header

    outerSections = sectionEl.find_elements(By.CSS_SELECTOR, "section")
    if sectionEl.tag_name == "section":
        outerSections.append(sectionEl)
    if len(outerSections) < 1:
        infoInstance.add(
            "differentErrors",
            f"{infoInstance.id}'s course list does not have any outerSection",
        )

    for outerSection in outerSections:
        current_list = {}
        header = find_header(outerSection)
        current_list["name"] = header
        innerSections = outerSection.find_elements(By.CSS_SELECTOR, "section")
        innerHeaders = [find_header(section) for section in innerSections]
        current_list["innerLists"] = innerHeaders
        current_list["type"] = type
        if "list" in header.lower():
            current_list["type"] = "cl"

        biggestuls = safe_find_element(outerSection, By.CSS_SELECTOR, biggestulCSS)
        if biggestuls is None:
            infoInstance.add(
                "differentErrors",
                f"158: one of {infoInstance.id}'s innerSections has 0 biggest uls",
            )
            continue
        try:
            infoInstance.id += "-" + type
            listInfo = extractContainerInfo(biggestuls, infoInstance)
            infoInstance.id = infoInstance.id[:-3]
            current_list["requirement"] = listInfo
            course_lists.append(current_list)
        except Exception as e:
            print(f"Error: {e}")
            print(f"Traceback:\n{traceback.format_exc()}")
            infoInstance.add(
                "differentErrors",
                f"172: error occured when extractingContainerInfo for {infoInstance.id}",
            )
            infoInstance.add(
                "traces", infoInstance.id, f"Traceback:\n{traceback.format_exc()}"
            )
    infoInstance.add("differentCourseLists", f"{infoInstance.id}-{type}", course_lists)
    return course_lists


def extract_system_of_study(sectionEl: WebElement, infoInstance: InfoClass):
    """Returns: 'regular'|'co-op'|'both'|'err'"""
    innerTextCSS = 'div[class*="program-view__pre___"]'
    innerEl = safe_find_element(sectionEl, By.CSS_SELECTOR, innerTextCSS)
    if innerEl is None:
        infoInstance.add(
            "differentErrors",
            f"{infoInstance.id} has no innerEl in extract_system_of_study",
        )
        return "err"
    systems = innerEl.text.lower().replace("co-operative", "co-op").split("\n")
    if (
        any(item != "co-op" and item != "regular" for item in systems)
        or len(systems) == 0
    ):
        infoInstance.add(
            "differentErrors",
            f"{infoInstance.id} has something other than the two defined systems of study: {systems}",
        )
        return "err"
    if len(systems) == 2:
        return "both"
    else:
        return systems[0]


def addGroupTodb(
    groupName: str, programs: list, driver: WebDriver, infoInstance: InfoClass
):
    """programs: {program: str, url:str}[]"""
    programHeaderCSS = 'div[class*="program-view__itemTitleAndTranslationButton___"]'
    programSectionCSS = "div.noBreak"
    sectionHeadersCSS = "h3"
    sectionTextContainerCSS = "div[class*='program-view__pre___']"

    main_window = driver.current_window_handle

    for program in programs:
        programName = program["program"]
        infoInstance.id = f"{groupName}-{programName}"
        programType = find_program_type(programName, infoInstance)
        programInfo = {}
        specialization_dict = {}
        availableTo_dict = {}
        print(f"currently at {programName}")

        driver.switch_to.new_window("tab")
        driver.get(program["url"])
        WebDriverWait(driver, delayAmount).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, programHeaderCSS))
        )
        print("started process")
        sections = driver.find_elements(By.CSS_SELECTOR, programSectionCSS)
        for section in sections:
            header = safe_find_element(section, By.CSS_SELECTOR, sectionHeadersCSS)
            if not header:
                infoInstance.add(
                    "differentErrors",
                    f"135: {programName} does not have sectionHeadersCSS at one of sections",
                )
                continue
            section_type = header.text
            if section_type not in processedSectionTypes:
                infoInstance.add(
                    "differentSectionPageTypes", section_type, program["program"]
                )

            if section_type == "Course Requirements":
                extract_course_lists(section, infoInstance, "cr")
            elif section_type == "Course Lists":
                extract_course_lists(section, infoInstance, "cl")
            elif section_type == "Systems of Study":
                extract_system_of_study(section, infoInstance)
            elif section_type.lower().startswith("specialization"):
                specialization_dict[section_type] = section
            elif section_type.startswith("This") or section_type == "Student Audience":
                availableTo_dict[section_type] = section
        extract_specializations(specialization_dict, infoInstance)
        extract_availableTo(availableTo_dict, infoInstance)

        print("process finished")
        driver.close()
        driver.switch_to.window(main_window)


def get_program_reqs():
    classGroupCSS = 'div[class*="style__collapsibleBox___"]'
    expandButtonCSS = 'h2[class*="style__title___"]'
    linkContainerCSS = 'div[class*="style__columns___"]'
    infoInstance = InfoClass(
        [
            ("differentErrors", []),
            ("differentWarnings", []),
            ("differentConditionText", {}),
            # ("differentSpecializations", {}),
            ("differentAvailableTo", {}),
            # ("differentCourseListHeaders", {}),
            ("carefullGroupedCondition", {}),
            # ("differentGroupedCondition", {}),
            # ("differentCourseLists", {}),
            ("differentSectionPageTypes", {}),
            ("differentCourseReqsSections", {}),
            ("traces", {}),
        ]
    )

    UNDERGRAD_LINK = (
        "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/programs"
    )
    GRAD_LINK = (
        "https://uwaterloo.ca/academic-calendar/graduate-studies/catalog#/programs"
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

    porogramGroups = wait.until(
        EC.visibility_of_any_elements_located((By.CSS_SELECTOR, classGroupCSS))
    )

    offset = 0
    limit = 5
    i = 0
    groups = {}
    print(
        f"Hi, were starting with {len(porogramGroups)} pgs - going up to {min(limit, len(porogramGroups) - offset)}"
    )
    # random.seed(12)
    try:
        while i < min(limit, len(porogramGroups) - offset):
            # random choices
            # j = random.randint(0, len(porogramGroups))
            pg = porogramGroups[offset + i]  # TODO: reset this to: j -> offset + i
            i += 1
            updateGroup = {}
            expandButton = pg.find_element(By.CSS_SELECTOR, expandButtonCSS)

            # Math and Comp only
            # if (
            #     "math" not in expandButton.text.lower()
            #     and "computer" not in expandButton.text.lower()
            # ):
            #     limit += 1
            #     continue

            # bringing the button into view
            bringIntoView(driver, expandButton)

            # openning it
            expandButton = WebDriverWait(pg, delayAmount).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, expandButtonCSS))
            )
            expandButton.click()
            group_name = expandButton.text
            updateGroup["group_name"] = group_name
            groups[group_name] = "open"
            print(f"Starting at group: {group_name}")
            linkContainers = pg.find_elements(By.CSS_SELECTOR, linkContainerCSS)
            updateGroup["members"] = []
            for linkContainer in linkContainers:
                link = WebDriverWait(linkContainer, delayAmount).until(
                    EC.visibility_of_element_located((By.TAG_NAME, "a"))
                )
                updateGroup["members"].append(
                    {"program": link.text, "url": link.get_attribute("href") or ""}
                )

            # closing it
            expandButton = WebDriverWait(pg, delayAmount).until(
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
                expandGroup = pg.find_element(
                    By.CSS_SELECTOR, "div.ReactCollapse--collapse"
                )
                WebDriverWait(pg, delayAmount).until(EC.staleness_of(expandGroup))
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
        print("Traces: ")
        for key, trace in infoInstance.get("traces").items():
            print("\n\n---------------")
            print(f"key: {key}")
            print(trace)
        return infoInstance.returnJson(
            {"groups": groups, "i": i + offset}, removedTags={"traces"}
        )
