import requests 
from bs4 import BeautifulSoup

from .majors import add_major
from ..Schema import Major

def extract_majors():
    #Getting the url and setting up beautiful soup
    URL = "https://uwaterloo.ca/future-students/programs/by-faculty#health"
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
        print(m.url)
