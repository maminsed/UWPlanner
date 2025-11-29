import time
import traceback

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

from .course_reqs import extractContainerInfo, safe_find_element

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
    "Offered by Faculty(ies)": "Diploma in Fundamentals of Anti-Racist Communication",  # offeredByFaculties
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
        - Course Requirements
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

program_type_map = [
    ["diploma", "diploma"],
    ["certificate", "certificate"],
    ["degree requirements", "degree"],
    ["joint honour", "joint major"],
    ["joint major", "joint major"],
    ["joint bachelor", "joint major"],
    ["double degree", "double degree"],
    ["bachelor", "major"],
    ["honours", "major"],
    ["major", "major"],
    ["arts and business", "major"],  # ?
    ["minor", "minor"],
    ["specialization", "specialization"],
    ["option", "option"],
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


def find_type(programName: str, infoDictionary: dict):
    programName = programName.lower()
    # weird cases
    if programName.startswith("mathematical optimization"):
        return "major"

    res = ""
    for keyword, programType in program_type_map:
        if keyword in programName:
            if "joint" in res or "double" in res or "degree" == "res":
                continue
            elif res != "" and res != programType:
                infoDictionary["differentErrors"].append(
                    f"55: {programName} has both {keyword} and {res}"
                )
            else:
                res = programType
                # TODO: after confirimng behvaiour uncomment:
                # break
    if not res:
        infoDictionary["differentErrors"].append(
            f"60: {programName} does not have any types"
        )
        res = "none"
    return res


# differentCourseReqsSections = {}
# differentCourseReqs = {}


def courseReqs(sectionEl: WebElement, programName: str, infoDictionary: dict):
    """For now SectionEl has to be as outer as possible. (within the section obv)"""
    rulesWrapperCSS = "div.rules-wrapper"
    innerSectionsCSS = "section:not(section section)"
    headerCSS = 'div[class*="style__itemHeaderH2"]'
    biggestulCSS = ":scope ul:not(:scope ul ul)"
    courseRequirement = {}

    # TODO: just get the first one
    rules = sectionEl.find_elements(By.CSS_SELECTOR, rulesWrapperCSS)
    if len(rules) != 1:
        infoDictionary["differentErrors"].append(
            f"140: {programName}'s Course Requirements has {len(rules)} rules-wrappers"
        )
    if len(rules) < 1:
        # TODO: extract markdown
        return
    innerSections = rules[0].find_elements(By.CSS_SELECTOR, innerSectionsCSS)
    for innerSection in innerSections:
        header = innerSection.find_element(By.CSS_SELECTOR, headerCSS).text
        infoDictionary["differentCourseReqsSections"][header] = programName
        biggestuls = innerSection.find_elements(By.CSS_SELECTOR, biggestulCSS)
        if len(biggestuls) != 1:
            infoDictionary["differentErrors"].append(
                f"153: one of {programName}'s innerSections has {len(biggestuls)} biggest uls"
            )
        if len(biggestuls) == 0:
            # TODO: extract markdown
            continue
        try:
            listInfo = extractContainerInfo(
                biggestuls[0], programName, "", infoDictionary
            )
            infoDictionary["differentCourseReqs"][programName] = listInfo
        except Exception as e:
            print(f"161: error occured when extractingContainerInfo for {programName}")
            print(f"Error: {e}")
            print(f"Traceback:\n{traceback.format_exc()}")
            infoDictionary["differentErrors"].append(
                f"161: error occured when extractingContainerInfo for {programName}"
            )


def addGroupTodb(
    groupName: str, programs: list, driver: WebDriver, infoDictionary: dict
):
    """programs: {program: str, url:str}[]"""
    programHeaderCSS = 'div[class*="program-view__itemTitleAndTranslationButton___"]'
    programSectionCSS = "div.noBreak"
    sectionHeadersCSS = "h3"
    sectionTextContainerCSS = "div[class*='program-view__pre___']"

    main_window = driver.current_window_handle

    for program in programs:
        programName = program["program"]
        programType = find_type(programName, infoDictionary)
        programInfo = {}
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
                infoDictionary["differentErrors"].append(
                    f"135: {programName} does not have sectionHeadersCSS at one of sections"
                )
                continue
            section_type = header.text
            if section_type not in processedSectionTypes:
                infoDictionary["differentSectionTypes"][section_type] = program[
                    "program"
                ]

            if section_type == "Course Requirements":
                courseReqs(section, programName, infoDictionary)

        driver.close()
        driver.switch_to.window(main_window)


def get_program_reqs():
    # Refactor infoDictionary to use class with getters and setters
    classGroupCSS = 'div[class*="style__collapsibleBox___"]'
    expandButtonCSS = 'h2[class*="style__title___"]'
    linkContainerCSS = 'div[class*="style__columns___"]'
    infoDictionary = {
        # "differentPrograms": differentPrograms,
        "differentSectionTypes": {},
        "differentErrors": [],
        "differentCourseReqsSections": {},
        "differentConditionText": {},
        "differentCourseReqs": {},
        "differentGroupedCondition": {},
    }

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

    offset = 1
    limit = 2
    i = 0
    groups = {}
    print(
        f"Hi, were starting with {len(porogramGroups)} cgs - going up to {min(limit, len(porogramGroups) - offset)}"
    )
    try:
        while i < min(limit, len(porogramGroups) - offset):
            # random choices
            # j = random.randint(0,len(porogramGroups))
            pg = porogramGroups[offset + i]  # TODO: reset this to: j -> offset + i
            i += 1
            updateGroup = {}
            expandButton = pg.find_element(By.CSS_SELECTOR, expandButtonCSS)

            # Math and Comp only
            # if "math" not in expandButton.text.lower() and "computer" not in expandButton.text.lower():
            #     limit+=1
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
                infoDictionary,
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
        infoDictionary["groups"] = groups
        infoDictionary["i"] = i + offset
        return infoDictionary
