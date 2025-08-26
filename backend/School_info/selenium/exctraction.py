"""This file is used for extracting data using selinium for Specializations."""

import os
import time

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

from backend.Schema import Major, Specialization, db


def extract_spec_page(web_path: str) -> list[tuple[str]]:
    """Function to find all the sequences on the webpath given.

    Requires:
        web_path (str):
            The Path to the page you want.

    Returns:
        the result of name,link,field for every sequence on that page.

    """
    file_path = os.path.abspath(os.path.join(__file__, "..", "chromedriver.exe"))
    service = Service(executable_path=file_path)
    driver = webdriver.Chrome(service=service)

    driver.get(web_path)

    time.sleep(2)
    specializations = driver.find_elements(By.CSS_SELECTOR, "li.style__item___1ewOk")
    print(len(specializations))
    res = []
    for s in specializations:
        name = s.find_element(By.TAG_NAME, "a").text.removesuffix("Specialization")
        link = s.find_element(By.TAG_NAME, "a").get_property("href")
        field = s.find_element(By.CSS_SELECTOR, "div.style__extension___1aLz5").text
        res.append((name, link, field))

    driver.quit()
    return res


def extract_majors_spec():
    try:
        # Connecting to web driver
        print("Connecting to Webdriver...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
    except Exception as e:
        print(e)
        return 500, {"message": "Error in connecting to webdriver"}

    added, errors = [], []
    specs = Specialization.query.all()
    for spec in specs:
        # First checking if the field is already a major
        possible = Major.query.filter_by(name=spec.field).first()
        if possible:
            if spec not in possible.specializations:
                possible.specializations.append(spec)
                added.append((spec.name, "Field"))
                db.session.add(possible)
                db.session.commit()
            print(f"{spec.name} was added through field with {spec.field}")
            continue
        driver.get(spec.link)
        time.sleep(2)

        sections = driver.find_elements(By.CSS_SELECTOR, ".noBreak")
        loM = []
        for s in sections:
            # Finding the section that says who can take it.
            h3 = s.find_element(By.CSS_SELECTOR, "h3").text
            if "is available for students" in h3:
                majors = s.find_element(
                    By.CSS_SELECTOR, "div.program-view__pre___1zoJ6"
                )
                # Getting the links in that section and going through each one
                links = majors.find_elements(By.CSS_SELECTOR, "a")
                if links:
                    # For each link, go to that page and get the name of the major and check if that major exists
                    #    if it exists add it to loM
                    for link in links:
                        try:
                            driver.get(link.get_property("href"))
                            name = (
                                driver.find_element(By.CSS_SELECTOR, "h2")
                                .text.split("(")[0]
                                .removeprefix("Bachelor of ")
                            )
                            major = Major.query.filter_by(name=name).first()
                            if major:
                                loM.append(major)
                            else:
                                print(f"No Major for {name} in {spec.name}")
                        except Exception as e:
                            print(e)
                            print(
                                f"Error in getting majors for {spec.name} at link: {link}"
                            )
                            continue
                else:
                    # If there is no link - like some options, we go through the names there manually
                    for m in majors.text.split("\n"):
                        m = m.removeprefix("Bachelor of ")
                        major = Major.query.filter_by(name=m).first()
                        if major:
                            loM.append(major)
                        else:
                            print(f"No Major for {m} in {spec.name}")
                break
        # If we found majors we add it if we didn't we just add it to errors
        if loM:
            for major in loM:
                if major not in spec.majors:
                    spec.majors.append(major)
            db.session.add(spec)
            db.session.commit()
            added.append((spec.name, "list of Majors"))
        else:
            errors.append(spec.name)

    driver.quit()
    return 200, {"errors": errors, "added": added}
