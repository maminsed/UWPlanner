import time

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

from backend.Schema import Major


def major_checking():
    """Function that checks if all the majors have valid urls"""
    print("initializing webdriver...")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.get("https://uwaterloo.ca/future-students/programs")
    time.sleep(2)
    section = driver.find_elements(
        By.CSS_SELECTOR,
        "section.uw-contained-width uw-section-spacing--default uw-section-separator--none uw-column-separator--none uw-section-alignment--top-align-content layout layout--uw-3-col even-split".replace(
            " ", "."
        ),
    )[1]

    names = section.find_elements(By.CSS_SELECTOR, "a")
    exists, dne = [], []
    for n in names:
        print(f"in name: {n.text}", end=" ")
        m = Major.query.filter_by(url=n.get_property("href") or "").first()
        if m:
            exists.append(m.name)
            print("exists")
        else:
            print("does not exist")
            dne.append(n.text)

    driver.quit()
    return exists, dne
