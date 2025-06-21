import requests
from bs4 import BeautifulSoup

from ..Schema import Major
from .majors import add_major, add_minor, update_coop_info, add_specialization
from .selenium.exctraction import extract_spec_page


def extract_majors() -> dict[str:list[str]|str]:
    """Function to extract majors from uwaterloo website."""
    # Getting the url and setting up beautiful soup
    URL = "https://uwaterloo.ca/future-students/programs/by-faculty"
    try:
        page = requests.get(URL, timeout=10)
    except Exception:
        return {"status": "False", "message": "website took too long to load"}

    soup = BeautifulSoup(page.content, "html.parser")

    # Putting the class name for faculties and programs
    faculty_class = "uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none layout layout--uw-1-col"
    program_class = "uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none uw-section-alignment--top-align-content layout layout--uw-3-col even-split"

    # getting all the results and looping through them.
    result = soup.find_all("section", class_=[faculty_class, program_class])

    cur_faculty = None
    added = []
    for item in result:
        # Checking if it's a faculty and if it is putting the cur_faculty to the correct one
        if "layout--uw-1-col" in item["class"]:
            faculty = item.find("h2")
            if faculty:
                cur_faculty = faculty.text.strip().split(" ")[2]
        else:
            # The First one is a fake.
            if cur_faculty is None:
                continue
            # Getting all the majors for each faculty and going through each one to find the name and url.
            lsts_majors = item.find_all(class_="uw-copy-text__wrapper")
            for lst in lsts_majors:
                for major in lst.find_all("a"):
                    major_name, url = major.text, major["href"]
                    print(major_name)
                    added.append(major_name)
                    res = add_major(major_name, cur_faculty, url)
                    print(res)
                    # If one of them faces and issue everyone faces an issue.
                    if not res[0]:
                        return False

    return {"status": "True", "added":added}


def update_major_info() -> None:
    """Function to update whether a major has a coop program or regular program."""
    errors = []
    #Going through each major added
    for m in Major.query.all():
        #Downloading the page and finding the coop info section.
        try:
            page = requests.get(m.url, timeout=10)
        except Exception:
            errors.append(m.name)
        coop_section_class = [
            "uw-contained-width uw-contained-width--wide uw-section__background--full-width uw-section-spacing--default uw-section-separator--none uw-column-separator--between uw-section__background-image uw-section__tint-color--none uw-section__text-color--black-white-shadow layout layout--uw-3-col even-split uw-section__background-image-2547",
            "uw-contained-width uw-contained-width--wide uw-section__background--full-width uw-section-spacing--default uw-section-separator--none uw-column-separator--between uw-section-alignment--top-align-content uw-section__background-image uw-section__tint-color--none uw-section__text-color--black-white-shadow layout layout--uw-3-col even-split uw-section__background-image-2547",
            "uw-contained-width uw-contained-width--wide uw-section__background--full-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none uw-section-alignment--top-align-content uw-section__background-image uw-section__tint-color--none uw-section__text-color--black layout layout--uw-3-col even-split uw-section__background-image-2547",
        ]
        soup = BeautifulSoup(page.content, "html.parser")

        #If there is no coop section add it to the errors
        coop_section = soup.find("section", class_=coop_section_class)
        if not coop_section:
            errors.append(m.name)
            continue
        
        #Gettting program information and updating it accordingly
        program_info_class = "uw-copy-text__wrapper"
        program_info = coop_section.find_all("div", class_=program_info_class)
        if not program_info:
            print(m.name, " Does not have program_info")
            continue

        coop = (program_info[0].find("strong")).text.strip().lower() != "no"
        regular = (program_info[1].find("strong")).text.strip().lower() != "no"
        minor = (program_info[2].find("strong")).text.strip().lower() != "no"

        #Updating coop information and printing the result
        update_coop_info(m, coop, regular, minor)
        print(m.name, " is successful")
        print(coop, regular, minor)
    #Printing the errors
    print("No coop section in: ", errors)


def extract_minors() -> None:
    """Function to extract minors from uwaterloo website."""
    URL = "https://uwaterloo.ca/future-students/programs/minors"
    page = requests.get(URL, timeout=10)
    soup = BeautifulSoup(page.content, "html.parser")

    minors_class = "block block-uw-custom-blocks block-uw-cbl-expand-collapse"
    all_minors = soup.find("div", class_=minors_class)
    errors = []
    #Going through each minor and adding it to the database. If it causes and issue adding it to errors.
    for section in all_minors.find_all("details", class_="uw-details"):
        theme = section.find("h3").text
        for minor in section.find_all("a"):
            link = minor["href"]
            name = minor.text
            res = add_minor(name, theme, link)

            #Printing the results for logging purposes.
            print(res)
            if not res[0]:
                errors.append(name)
    #Printing errors if any.
    print("errors: ", errors)

def extract_specializations() -> None:
    """Function to extract Specializations. Uses the Selenium Version."""
    specs = extract_spec_page()

    errors = []
    for name,link,field in specs:
        res = add_specialization(name,link,field)
        print(res)
        if not res[0]:
            errors.append((name, res[1]))
    print("errors: ", errors)
