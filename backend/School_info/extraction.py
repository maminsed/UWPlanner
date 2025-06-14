import requests 
from bs4 import BeautifulSoup

URL = "https://uwaterloo.ca/future-students/programs/by-faculty#health"
page = requests.get(URL)

soup = BeautifulSoup(page.content, "html.parser")

faculty_class = "uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none layout layout--uw-1-col"
program_class = "uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none uw-section-alignment--top-align-content layout layout--uw-3-col even-split"

result = soup.find_all("section", class_=[faculty_class, program_class])


for item in result:
    if "layout--uw-1-col" in item["class"]:
        # faculty = item.find("h2")
        # print(faculty)
        # if faculty:
        #     print(faculty.text.strip().split(" ")[2])
        pass
    else:
        lsts_majors = item.find_all(class_="uw-copy-text__wrapper")
        for lst in lsts_majors:
           for major in lst.find_all("a"):
               print(major.text, major["href"])
    print("\n\n\n")
    # print(item["class"])
