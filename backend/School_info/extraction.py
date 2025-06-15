import requests 
import os
from bs4 import BeautifulSoup

from .majors import add_major, update_coop_info
from ..Schema import Major

def extract_majors():
    """Function to extract majors from uwaterloo website."""
    #Getting the url and setting up beautiful soup
    URL = "https://uwaterloo.ca/future-students/programs/by-faculty"
    page = requests.get(URL)

    soup = BeautifulSoup(page.content, "html.parser")

    #Putting the class name for faculties and programs
    faculty_class = "uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none layout layout--uw-1-col"
    program_class = "uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none uw-section-alignment--top-align-content layout layout--uw-3-col even-split"

    #getting all the results and looping through them.
    result = soup.find_all("section", class_=[faculty_class, program_class])

    cur_faculty = None
    added = []
    for item in result:
        #Checking if it's a faculty and if it is putting the cur_faculty to the correct one
        if "layout--uw-1-col" in item["class"]:
            faculty = item.find("h2")
            if faculty:
                cur_faculty = faculty.text.strip().split(" ")[2]
        else:
            #The First one is a fake.
            if cur_faculty is None:
                continue
            #Getting all the majors for each faculty and going through each one to find the name and url. 
            lsts_majors = item.find_all(class_="uw-copy-text__wrapper")
            for lst in lsts_majors:
                for major in lst.find_all("a"):
                    major_name, url = major.text, major["href"]
                    print(major_name)
                    added.append(major_name)
                    res = add_major(major_name, cur_faculty, url)
                    print(res)
                    #If one of them faces and issue everyone faces an issue. 
                    if not res[0]:
                        return False

    return added


def update_major_info():
    for m in Major.query.all():
        page = requests.get(m.url)
        coop_section_class = "uw-contained-width uw-contained-width--wide uw-section__background--full-width uw-section-spacing--default uw-section-separator--none uw-column-separator--between uw-section__background-image uw-section__tint-color--none uw-section__text-color--black-white-shadow layout layout--uw-3-col even-split uw-section__background-image-2547"
        soup = BeautifulSoup(page.content, "html.parser")

        coop_section = soup.find("section", class_=coop_section_class)

        program_info_class = "uw-copy-text__wrapper"
        program_info = coop_section.find_all("div", class_=program_info_class)
        if not program_info:
            print(m.name, " Does not have program_info")
            continue
        coop = (program_info[0].find("strong")).text.strip().lower() != "no"
        regular = (program_info[1].find("strong")).text.strip().lower() != "no"
        minor = (program_info[2].find("strong")).text.strip().lower() != "no"
        update_coop_info(m, coop, regular,minor)
        print(m.name, " is successfull")
        print(coop, regular, minor)
