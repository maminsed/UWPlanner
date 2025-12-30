import json
import re
import time
import traceback
from collections import defaultdict
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

from backend.Schema import Programs, Sequence, db

from .constants import CONSTANT_URLS, constantCSSs, count
from .course_reqs import extractContainerInfo, get_link_attr, safe_find_element
from .extraction_utils import InfoClass

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


def get_clean_link_href(linkEl: WebElement):
    url = linkEl.get_attribute("href") or ""
    firstQuestionMark = url.find("?")
    if firstQuestionMark != -1:
        url = url[:firstQuestionMark]
    return url


def extract_table_markdown(tableEl: WebElement, infoInstance: InfoClass) -> str:
    def addRow(cells: list[str]):
        current_row = "|"
        for cell in cells:
            current_row += cell + "|"
        return current_row

    tableDict = extract_table(tableEl, infoInstance)
    result_md = addRow(tableDict["headers"]) + "\n"
    result_md += addRow(["-" for _ in tableDict["headers"]])
    for row in tableDict["rows"]:
        result_md += "\n" + addRow(row)
    return result_md


def extract_markdown(section: WebElement, infoInstance: InfoClass):
    # First, fix all anchor tags to use their actual href attributes
    links = section.find_elements(By.TAG_NAME, "a")
    driver: WebDriver = section.parent

    for link in links:
        actual_href = link.get_attribute("href")
        if actual_href:
            driver.execute_script(
                "arguments[0].setAttribute('href', arguments[1]);", link, actual_href
            )

    # Fix all tables to use the correct markdown version
    tables = section.find_elements(By.TAG_NAME, "table")
    table_md_map: dict[str, str] = {}
    for idx, table in enumerate(tables):
        placeholder = f"@@TABLEPLACEHOLDERTAG{idx}@@"
        table_md = extract_table_markdown(table, infoInstance)
        table_md_map[placeholder] = table_md

        driver.execute_script(
            """
            const table = arguments[0];
            const placeholder = arguments[1];
            const p = document.createElement('p');
            p.textContent = placeholder;
            table.replaceWith(p);
            """,
            table,
            placeholder,
        )

    html = section.get_attribute("innerHTML") or ""
    result_md = md(html, heading_style="ATX", strip=["style", "script"])

    for placeholder, table_md in table_md_map.items():
        result_md = result_md.replace(placeholder, table_md)

    return result_md


def extract_availableTo(sectionEls: dict[str, WebElement], infoInstance: InfoClass):
    """Returns: {
        "name": str;
        "markdown": str;
        "realtedProgramUrls": {
            "text":str,
            "matchingUrls": (str|"any"|"any_degree")[],
        }[]
    }
    """
    result = []
    for key, innerEl in sectionEls.items():
        current_result = {"realtedProgramUrls": []}
        if "specialization" in key.lower():
            links = innerEl.find_elements(By.CSS_SELECTOR, "a")
            if len(links) == 0:
                infoInstance.add(
                    "differentErrors",
                    "there is no links found in extract_availableTo for specialization section",
                )
                continue
            for link in links:
                link_attr = get_link_attr(link)
                if link_attr["linkType"] == "programs":
                    current_result["realtedProgramUrls"].append(
                        {"text": link_attr["value"], "matchingUrls": [link_attr["url"]]}
                    )
        elif "option" in key.lower():
            bachelors = innerEl.text.split("\n")
            if not len(bachelors):
                infoInstance.add(
                    "differentErrors",
                    f"{infoInstance.id} has options section but no option in it",
                )
            else:
                updated_bachelors = []
                for bachelor in bachelors:
                    startIdx = bachelor.find("(")
                    endIdx = bachelor.find(")")
                    if startIdx != -1:
                        updated_bachelors.append(
                            {
                                "raw": bachelor[:startIdx].lower().strip(),
                                "paran": bachelor[startIdx + 1 : endIdx].lower(),
                                "orig": bachelor,
                            }
                        )
                    else:
                        updated_bachelors.append(
                            {"raw": bachelor.lower(), "paran": "", "orig": bachelor}
                        )
                # First we check if the pattern is found
                regex_pattern_list = {}
                for b in updated_bachelors:
                    current_patten = b["raw"]
                    if b["paran"]:
                        current_patten += rf".*\(.*{b['paran']}.*\)"
                    regex_pattern_list[b["orig"]] = current_patten
                regex_patten = (
                    "^.*(" + "|".join(list(regex_pattern_list.values())) + ").*$"
                )
                matching_programs = Programs.query.filter(
                    Programs.name.regexp_match(regex_patten, "i")
                ).all()
                # then we check that every bachelor has at least one match
                counter = defaultdict(list)
                for matching_program in matching_programs:
                    for idx, rp in regex_pattern_list.items():
                        if re.match(rf"^.*{rp}.*$", matching_program.name):
                            counter[idx].append(matching_program)
                            break
                updated_bachelors = [
                    ub for ub in updated_bachelors if ub["orig"] not in counter
                ]

                # If there is a bachelor that did not match, we will check again
                if updated_bachelors:
                    regex_pattern_list = {}
                    for b in updated_bachelors:
                        current_patten = ""
                        if b["paran"]:
                            current_patten += rf"(?=.*{b['paran']})"
                        current_patten += rf"(?=.*{b['raw']})"
                        regex_pattern_list[b["orig"]] = current_patten
                    regex_patten = (
                        "^(" + "|".join(list(regex_pattern_list.values())) + ").*$"
                    )
                    new_matching_programs = Programs.query.filter(
                        Programs.name.regexp_match(regex_patten, "i")
                    ).all()
                    for matching_program in new_matching_programs:
                        for idx, rp in regex_pattern_list.items():
                            if re.match(rf"^{rp}.*$", matching_program.name):
                                counter[idx].append(matching_program)
                                break
                    no_match_found = [
                        ub["orig"]
                        for ub in updated_bachelors
                        if ub["orig"] not in counter
                    ]
                    if len(no_match_found):
                        infoInstance.add(
                            "differentErrors",
                            f"there was no matching programs for some of the availableTo bachelors in {infoInstance.id}: no_match_found: {no_match_found}",
                        )
                # Then we filter each group to only have degrees if it has degrees.
                for orig, mps in counter.items():
                    degrees = []
                    for mp in mps:
                        if mp.programType == "degree":
                            degrees.append(mp)
                    if len(degrees):
                        current_result["realtedProgramUrls"].append(
                            {"text": orig, "matchingUrls": [d.url for d in degrees]}
                        )
                    else:
                        current_result["realtedProgramUrls"].append(
                            {"text": orig, "matchingUrls": [d.url for d in mps]}
                        )
        elif "Student Audience" == key:
            student_audience_regex = r"^this credential is open to students enrolled in(?: any)? degree programs?( or any non- or post-degree academic plan)?[^0-9a-z]*$"
            matched = re.split(student_audience_regex, innerEl.text.lower())
            if len(matched) > 1:
                current_result["realtedProgramUrls"].append(
                    {
                        "text": innerEl.text,
                        "matchingUrls": "any"
                        if matched[1] is not None
                        else "any_degree",
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
                f"{key} appeared in extract_availableTo when it shouldn't have",
            )
            continue
        if not len(current_result["realtedProgramUrls"]):
            continue
        current_result["name"] = key
        current_result["markdown"] = extract_markdown(innerEl, infoInstance)
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

    links_css = "a"
    result = {}
    if "Specializations List" in sections:
        result["type"] = "programs"
        # Extract "Specializations" section text
        specialization_element = sections["Specializations"]
        result["at_least_one_required"] = False
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
        specialization_list_element = sections["Specializations List"]
        result["specialization_options"] = []
        result["list_text"] = ""

        if specialization_list_element is None:
            infoInstance.add(
                "differentErrors",
                f"Missing text content in 'Specializations List' section for {infoInstance.id}",
            )
        else:
            result["list_text"] = extract_markdown(
                specialization_list_element, infoInstance
            )
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


# TODO: use more of this
def get_header(sectionEl: WebElement):
    header = sectionEl.find_element(
        By.CSS_SELECTOR, constantCSSs["courseListHeader"]
    ).text
    return header


def extract_course_lists(
    sectionEl: WebElement, infoInstance: InfoClass, type: Literal["cl", "cr"] = "cl"
) -> list[dict[str]]:
    """For now SectionEl has to be as outer as possible. (within the section obv)

    Returns: RequirementType[]
    """
    # innerSectionCSS = ":scope section:not(:scope section section)"
    biggestulCSS = ":scope ul:not(:scope ul ul)"
    course_lists = []

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
        header = get_header(outerSection)
        current_list["name"] = header
        innerSections = outerSection.find_elements(By.CSS_SELECTOR, "section")
        innerHeaders = [get_header(section) for section in innerSections]
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


def extract_system_of_study(innerEl: WebElement, infoInstance: InfoClass):
    """Returns: 'regular'|'co-op'|'both'|'err'"""
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


def extract_offering_faculties(innerEl: WebElement) -> list:
    """Returns: str[] # faculty names || ['err']"""
    faculties = innerEl.text.lower().replace("faculty of ", "").split("\n")
    return faculties


def extract_table(tableEl: WebElement, infoInstance: InfoClass):
    """Returns:
    {
        "headers": str[]
        "rows": str[][]
    }
    """
    header = safe_find_element(tableEl, By.TAG_NAME, "thead")
    body = safe_find_element(tableEl, By.TAG_NAME, "tbody")
    result = {"headers": [], "rows": []}
    if header is None or body is None:
        infoInstance.add(
            "differentErrors", f"{infoInstance.id} has a table but no body or no header"
        )
        return result
    headerTexts = header.find_elements(By.TAG_NAME, "th")
    for headerText in headerTexts:
        result["headers"].append(headerText.text)
    rows = body.find_elements(By.TAG_NAME, "tr")
    headerCount = len(result["headers"])
    rowSpan = 1
    for idx, row in enumerate(rows):
        rowSpan -= 1
        currentRow = []
        cells = row.find_elements(By.TAG_NAME, "td")
        if len(cells) == headerCount - 1 and rowSpan > 0:
            currentRow.append(result["rows"][-1][0])
        elif len(cells) != headerCount:
            infoInstance.add(
                "differentErrors",
                f"there are {len(cells)} at one of the rows but there should be {headerCount} at {infoInstance.id} at row: {idx}. with rowSpan : {rowSpan}",
            )
            rowSpan = 1
        else:
            rowSpan = int(cells[0].get_attribute("rowspan") or 1)

        for cell in cells:
            currentRow.append(cell.text)
        result["rows"].append(currentRow)
    return result


def refine_sequences(table: dict[str, list], infoInstance: InfoClass):
    """Returns: {"SS":str,"appliesTo":str,"planPath":str[]}[]"""

    def process_cell(cell: str):
        cell = cell.strip()
        if re.match(r"[0-9][AB]", cell):
            return "Study"
        if cell.startswith("WT"):
            return "Coop"
        if cell == "" or cell == "off":
            cell = "Off"
        else:
            infoInstance.add(
                "differentWarnings",
                f"{infoInstance.id} has a cell that is not registered: {cell}",
            )
        return cell

    hasSS = "S/S" in table["headers"] or "Sequence" in table["headers"]
    noappliesTo = hasSS and "Plan" not in table["headers"]
    result = []
    # Making sure there is no unwanted header
    if any(
        header not in ["S", "F", "W", "Plan", "Sequence"]
        and not (hasSS and header == "S/S")
        for header in table["headers"]
    ):
        infoInstance.add(
            "differentErrors",
            f"{infoInstance.id} has a header thats not registered: {table['headers']}",
        )
    # Processing each row
    for row in table["rows"]:
        appliesTo: str = row[0]
        SS: str = row[1] if hasSS else ""
        if noappliesTo:
            appliesTo = ""
            SS = row[0]
        planPath = [
            process_cell(cell) for idx, cell in enumerate(row) if idx > int(hasSS)
        ]
        result.append({"appliesTo": appliesTo, "SS": SS, "planPath": planPath})
    # if there are duplicate appliesTos with the same SS, we should do something about them.
    counter = defaultdict(list)
    for idx, item in enumerate(result):
        key = f"{item['appliesTo']}-{item['SS']}"
        counter[key].append(idx)
    MAX_SEQUENCE_LENGTH = 3  # e.g. 4, 4S, 4X, (+ one extra for room to wiggle)
    for key, indices in counter.items():
        SS = result[indices[0]]["SS"]
        if len(indices) == 1:
            if not SS:
                SS = result[indices[0]]["appliesTo"]
            elif len(SS) <= MAX_SEQUENCE_LENGTH:
                SS = "Sequence " + SS
            result[indices[0]]["SS"] = SS
            continue
        if SS != "":
            infoInstance.add(
                "differentErrors",
                f"{infoInstance.id} has {len(indices)} matches for key: {key}",
            )
            continue
        for i, idx in enumerate(indices):
            result[idx]["SS"] = "Sequence " + str(i + 1)
    return result


def extract_sequences(sectionEl: WebElement, infoInstance: InfoClass):
    """Returns: {
        "sequences": {"SS":str,"appliesTo":str,"planPath":str[]}[],
        "legend": dict[str,str][],
    }
    """
    tables = sectionEl.find_elements(By.TAG_NAME, "table")
    result = {"sequences": [], "legend": {}}
    for table in tables:
        header = table.find_element(By.XPATH, "preceding-sibling::*[1]").text
        extracted_table = extract_table(table, infoInstance)
        if header.startswith("Study/Work Sequence"):
            sequences = refine_sequences(extracted_table, infoInstance)
            result["sequences"] = sequences
        elif header.startswith("Legend for Study/Work Sequence"):
            result["legend"] = {items[0]: items[1] for items in extracted_table["rows"]}
    infoInstance.add("differentSequences", infoInstance.id, result)
    return result


def extract_degree_info(sectionEl: WebElement, infoInstance: InfoClass):
    """Returns: {name: str, id: number} || None"""
    programs_link = CONSTANT_URLS[infoInstance.get("LEVEL_OF_STUDY")]["PROGRAMS"]
    links = [
        get_clean_link_href(link) for link in sectionEl.find_elements(By.TAG_NAME, "a")
    ]
    filtered_links = [
        link for link in links if link is not None and programs_link in link
    ]
    degrees = []
    if len(filtered_links):
        matching_programs = Programs.query.filter(
            Programs.url.in_(filtered_links)
        ).all()
        for program in matching_programs:
            if program.programType == "degree":
                degrees.append({"name": program.name, "id": program.id})
    if len(degrees) != 1:
        infoInstance.add(
            "differentErrors",
            f"{infoInstance.id} has {len(degrees)} != 1 degrees in its degreeInfo with filtered_links = {filtered_links}",
        )
        return None
    return degrees[0]


def save_program_to_db(programInfo: dict, infoInstance: InfoClass):
    saveTodb: bool = infoInstance.get("saveTodb", False)
    print(f"save to db: {saveTodb}")
    # first we see if the program exists in the database:
    try:
        print("\tsaving started")
        db_program: Programs = Programs.query.filter_by(
            name=programInfo["name"], groupName=programInfo["groupName"]
        ).first()
        if db_program is None:
            db_program = Programs(
                name=programInfo["name"],
                programType=programInfo["programType"],
                url=programInfo["url"],
                groupName=programInfo["groupName"],
            )
        else:
            db_program.url = programInfo["url"]
            db_program.programType = programInfo["programType"]

        headers: list[tuple[str, bool]] = [
            ("degreeName", False),
            ("degreeId", False),
            ("systemOfStudy", False),
            ("offeredByFaculties", True),
            ("specializations", True),
            ("availableTo", True),
            ("courseRequirements", True),
            ("courseLists", True),
            ("otherSections", True),
        ]
        for header, is_json in headers:
            if programInfo.get(header):
                value = programInfo[header]
                if is_json:
                    value = json.dumps(value)
                setattr(db_program, header, value)
        # TODO: sequences
        if "sequences" in programInfo and saveTodb:
            db.session.add(db_program)
            db.session.flush()
            legend = json.dumps(programInfo["sequences"]["legend"])
            for seq in programInfo["sequences"]["sequences"]:
                seq_name: str = seq["SS"]
                appliesTo = seq["appliesTo"]
                plan_path = json.dumps(seq["planPath"])
                existing_sequence: Sequence = Sequence.query.filter_by(
                    name=seq_name, appliesTo=appliesTo, plan=plan_path
                ).first()
                if existing_sequence is not None:
                    print(
                        f"sequence: name: {seq_name}, appliesTo: {appliesTo}, planPath: {plan_path[:20]} already exists"
                    )
                    changed = False
                    if db_program not in existing_sequence.programs:
                        existing_sequence.programs.append(db_program)
                        changed = True
                    if existing_sequence.legend != legend:
                        existing_sequence.legend = legend
                        changed = True
                    if changed:
                        db.session.add(existing_sequence)
                        db.session.add(db_program)
                        db.session.flush()
                else:
                    new_seq = Sequence(
                        name=seq_name,
                        legend=legend,
                        appliesTo=appliesTo,
                        plan=plan_path,
                    )
                    new_seq.programs.append(db_program)
                    db.session.add(new_seq)
                    db.session.add(db_program)
                    db.session.flush()
        if saveTodb:
            db.session.add(db_program)
            db.session.commit()
            print("\tsaved")
        else:
            print("\tdid not save")
    except Exception as e:
        db.session.rollback()
        print("error occurred while saving to db:")
        print(f"Error: {e}")
        print(f"Traceback:\n{traceback.format_exc()}")
        infoInstance.add(
            "differentErrors",
            f"error occurred while saving to db for {infoInstance.id}",
        )
        infoInstance.add(
            "traces", infoInstance.id, f"Traceback:\n{traceback.format_exc()}"
        )


def addGroupTodb(
    groupName: str, programs: list, driver: WebDriver, infoInstance: InfoClass
):
    """Adds the group to db"""
    programHeaderCSS = 'div[class*="program-view__itemTitleAndTranslationButton___"]'
    programSectionCSS = "div.noBreak"
    sectionHeadersCSS = "h3"

    main_window = driver.current_window_handle

    for program in programs:
        programInfo = {}
        programName = program["program"]
        infoInstance.id = f"{groupName}-{programName}"
        programType = find_program_type(programName, infoInstance)

        specialization_dict = {}
        lists_and_reqs = {"courseLists": [], "courseRequirements": []}
        availableTo_dict = {}
        otherSections = {"order": []}

        programInfo["name"] = programName
        programInfo["programType"] = programType
        programInfo["url"] = program["url"]
        programInfo["groupName"] = groupName
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
            innerEl = safe_find_element(
                section, By.CSS_SELECTOR, constantCSSs["sectionInnerText"]
            )
            if not header or not innerEl:
                infoInstance.add(
                    "differentErrors",
                    f"135: {programName} does not have sectionHeadersCSS or innerEl at one of sections: {header.text if header else ''}",
                )
                continue
            section_type = header.text
            if section_type not in processedSectionTypes:
                infoInstance.add(
                    "differentSectionPageTypes", section_type, program["program"]
                )

            if section_type == "Graduation Requirements" and (
                "major" in programType or programType == "double degree"
            ):
                # degreeName
                degree_info = extract_degree_info(section, infoInstance)
                if degree_info is not None:
                    programInfo["degreeName"] = degree_info["name"]
                    programInfo["degreeId"] = degree_info["id"]
            if section_type == "Course Requirements":
                courseReqs = extract_course_lists(section, infoInstance, "cr")
                for item in courseReqs:
                    addedKey = "courseRequirements"
                    if item["type"] == "cl":
                        addedKey = "courseLists"
                    lists_and_reqs[addedKey].append(
                        {k: v for k, v in item.items() if k != "type"}
                    )
            elif section_type == "Course Lists":
                courseLists = extract_course_lists(section, infoInstance, "cl")
                for item in courseLists:
                    item.pop("type", None)
                    lists_and_reqs["courseLists"].append(item)
            elif section_type == "Systems of Study":
                programInfo["systemOfStudy"] = extract_system_of_study(
                    innerEl, infoInstance
                )
            elif section_type == "Offered by Faculty(ies)":
                programInfo["offeredByFaculties"] = extract_offering_faculties(innerEl)
            elif (
                section_type == "Degree Requirements"
                or section_type == "Co-operative Education Program Requirements"
            ):
                prevId = infoInstance.id
                infoInstance.id += "-" + section_type[:2].lower()
                extracted_sequences = extract_sequences(innerEl, infoInstance)
                if extracted_sequences["sequences"]:
                    programInfo["sequences"] = extracted_sequences
                infoInstance.id = prevId
                otherSections[section_type] = extract_markdown(innerEl, infoInstance)
                otherSections["order"].append(section_type)
            elif section_type.lower().startswith("specialization"):
                specialization_dict[section_type] = innerEl
            elif section_type.startswith("This") or section_type == "Student Audience":
                availableTo_dict[section_type] = innerEl
            else:
                otherSections[section_type] = extract_markdown(innerEl, infoInstance)
                otherSections["order"].append(section_type)
        specialization_result = extract_specializations(
            specialization_dict, infoInstance
        )
        if (
            specialization_result is not None
            and specialization_result["type"] == "course_req"
        ):
            for item in specialization_result["requirements"]:
                lists_and_reqs["courseLists"].append(
                    {k: v for k, v in item.items() if k != "type"}
                )
            specialization_result = None
        elif specialization_result is not None:
            specialization_result.pop("type", None)
        if specialization_result is not None:
            programInfo["specializations"] = specialization_result
        programInfo["availableTo"] = extract_availableTo(availableTo_dict, infoInstance)
        programInfo["courseRequirements"] = lists_and_reqs["courseRequirements"]
        programInfo["courseLists"] = lists_and_reqs["courseLists"]
        programInfo["otherSections"] = otherSections
        save_program_to_db(programInfo, infoInstance)
        infoInstance.add("differentProgramInfo", infoInstance.id, programInfo)

        print("process finished")
        driver.close()
        driver.switch_to.window(main_window)


def get_program_reqs():
    classGroupCSS = 'div[class*="style__collapsibleBox___"]'
    expandButtonCSS = 'h2[class*="style__title___"]'
    linkContainerCSS = 'div[class*="style__columns___"]'
    infoInstance = InfoClass(
        [
            ("differentErrors", set()),
            ("differentWarnings", set()),
            ("differentConditionText", {}),
            ("differentSequences", {}),
            # ("differentSpecializations", {}),
            # ("differentAvailableTo", {}),
            # ("differentCourseListHeaders", {}),
            ("carefullGroupedCondition", {}),
            # ("differentGroupedCondition", {}),
            # ("differentCourseLists", {}),
            # ("differentProgramInfo", {}),
            ("differentSectionPageTypes", {}),
            ("differentCourseReqsSections", {}),
            ("traces", {}),
        ]
    )
    infoInstance.setEnvVar("saveTodb", False)
    infoInstance.setEnvVar("LEVEL_OF_STUDY", "UNDERGRAD")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.get(CONSTANT_URLS[infoInstance.get("LEVEL_OF_STUDY")]["PROGRAMS"])
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
    limit = 1
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
            if (
                "degree" in expandButton.text.lower()
                or "option" in expandButton.text.lower()
            ):
                limit += 1
                continue

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
                    {"program": link.text, "url": get_clean_link_href(link)}
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
        print(f"Traceback:\n{traceback.format_exc()}")
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
