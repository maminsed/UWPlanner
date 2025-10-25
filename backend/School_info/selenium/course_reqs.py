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

from backend.Schema import Course

delayAmount = 15


def bringIntoView(driver, element):
    driver.execute_script(
        "arguments[0].scrollIntoView({block:'start'});",  # window.scrollTo({top: arguments[0].getBoundingClientRect().top, behavior: 'smooth'});
        element,
    )


# has to be the ul
# TODO:get rid of courseCode and upper
def extractListInfo(section: WebElement, courseCode: str, upper: str):
    def extractNested(startPoint: WebElement):
        # TODO: complete this
        pass

    # TODO: iffy...
    firstList = section.find_element(By.CSS_SELECTOR, "li")
    try:
        sectionType = firstList.find_element(By.CSS_SELECTOR, ":scope > span").text
        differentSectionTypes[sectionType] = courseCode
        # nestedUl = firstList.find_element(":scope > ul")
    except Exception:
        differentErrors.append(f"{courseCode}-{upper}")


# TODO: remove
differentSectionTypes = {}
differentHeaders = {}
differentErrors = []


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
    searchingHeaders = ["prerequisites", "antirequisites", "corequisites"]
    main_window = driver.current_window_handle
    # TODO: get rid of
    counter = 0
    for course in courses:
        # getting course values
        curr = course_dict[course.code]
        print(f"currently at: {course.code}")
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
            header = section.find_element(
                By.CSS_SELECTOR, sectionHeadersCSS
            ).text.lower()
            if header not in searchingHeaders:
                differentHeaders[header] = course.code
                continue
            container = section.find_element(By.CSS_SELECTOR, sectionTextContainerCSS)
            try:
                listVersion = container.find_element(By.CSS_SELECTOR, sectionsTextCSS)
            except Exception:
                listVersion = None
                print("not found")

            if listVersion:
                print("list found")
                course_json = extractListInfo(listVersion, course.code, header)

        # course.url = curr['url']
        driver.close()
        driver.switch_to.window(main_window)
        counter += 1
        if counter >= 20:
            break


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

    classGroups = driver.find_elements(By.CSS_SELECTOR, classGroupCSS)
    print(f"Hi, were starting with {len(classGroups)} cgs")
    counter = 1
    groups = {}
    try:
        for cg in classGroups:
            updateGroup = {}
            expandButton = WebDriverWait(cg, delayAmount).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, expandButtonCSS))
            )
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
                link = linkContainer.find_element(By.TAG_NAME, "a")
                updateGroup["members"].append(
                    {"course": link.text, "url": link.get_attribute("href")}
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

            # marking it as closed
            counter += 1
            if counter >= 1:
                break
    except Exception as e:
        print(e)
        print("error occured")
    finally:
        if driver:
            driver.quit()
        return {
            "groups": groups,
            "differentSectionTypes": differentSectionTypes,
            "differntHeaders": differentHeaders,
            "differentErrors": differentErrors,
        }
