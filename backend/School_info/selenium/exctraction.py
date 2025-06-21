from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time
import os

def extract_spec_page():
    file_path = os.path.abspath(os.path.join(__file__, "..", "chromedriver.exe"))
    service = Service(executable_path=file_path)
    driver = webdriver.Chrome(service=service)

    web_path = "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/programs?searchTerm=Specialization"
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
