"""The following script scrapes academic sequence information from the University of Waterloo's website.

It connects to the application's database, iterates through all the majors listed,
visits the URL associated with each major, and scrapes the course sequence tables.

The script is designed to be run from the command line.
"""

# import os
# import sys

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

# This is a crucial step to ensure that the script can find and import the necessary
# modules from your backend application, such as the Flask app instance and the db models.
# Because this script is nested deeper, it needs to go up three levels to find the root.
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
# Again im pretty sure because you are running __init__.py it already has this added.
# This causes looping imports im pretty sure, because backend also imports School_info
# from backend import create_app
from backend.Schema import Major, Sequence, db


def scrape_sequences() -> tuple[list[str]]:
    """Scrapes academic sequence information from Waterloo major pages.

    - Connects to the database via the Flask app context.
    - Iterates through all majors.
    - For each major, scrapes its URL to find sequence tables.
    - Parses sequence tables to create a 'plan' string.
    - Creates or reuses Sequence objects in the database (find-or-create pattern).
    - Associates the sequences with their corresponding majors (many-to-many).
    """
    # app = create_app()
    # with app.app_context():
    # A dictionary to track the sequence number for each faculty.
    # e.g., {'Arts': 1, 'Engineering': 4}
    faculty_sequence_counters = {}
    driver = None  # Initialize driver to None before the try block
    success, errors = [], []
    try:
        # 1. Initialize Selenium WebDriver
        print("Initializing WebDriver...")
        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service)
        except Exception as e:
            print(f"Error initializing WebDriver: {e}")
            print("Please ensure you have Google Chrome installed.")
            return

        # 2. Get all majors from the database
        majors = Major.query.order_by(Major.faculty).all()
        if not majors:
            print("No majors found in the database. Exiting.")
            return

        print(f"Found {len(majors)} majors to process.")

        # 3. Loop through each major
        for major in majors:
            # Initialize counter for a new faculty when we first see it
            faculty_sequence_counters.setdefault(major.faculty, 0)

            if major.faculty == "Mathematics":
                print(f"Skipping Math major (requires special handling): {major.name}")
                continue

            if not major.url or "http" not in major.url:
                print(f"Skipping major with invalid or missing URL: {major.name}")
                errors.append(major.name)
                continue

            print(f"Processing: {major.name}")

            try:
                driver.get(major.url)

                # Find all tables on the page, then filter them using an XPath selector
                # to get only those containing a header (th) with the word "Year".
                sequence_tables = driver.find_elements(
                    By.XPATH, "//table[.//th[contains(text(), 'Year')]]"
                )

                if not sequence_tables:
                    errors.append(major.name)
                    print(
                        f"  -> No sequence tables containing 'Year' in the header found for {major.name}."
                    )
                    continue

                for table in sequence_tables:
                    # We no longer find the name from the heading; we generate it.
                    plan_parts = []
                    rows = table.find_elements(By.TAG_NAME, "tr")
                    for row in rows:
                        # We only care about the data cells (td), not the headers (th)
                        terms = row.find_elements(By.TAG_NAME, "td")
                        for term in terms:
                            plan_parts.append(term.text.strip() or "-")

                    plan_string = ",".join(plan_parts)

                    if not plan_string:
                        # Skip empty tables or tables that only contain headers
                        errors.append(major.name)
                        print(
                            f"  -> Could not extract a plan from a table for {major.name}."
                        )
                        continue

                    # Find-or-Create Logic: Check if a sequence with an identical plan
                    # is already associated with any major from the SAME faculty.
                    sequence_obj = (
                        Sequence.query.join(Sequence.majors)
                        .filter(
                            Sequence.plan == plan_string, Major.faculty == major.faculty
                        )
                        .first()
                    )

                    if not sequence_obj:
                        # This is a new, unique sequence plan for this faculty.
                        # Increment the counter for this specific faculty.
                        faculty_sequence_counters[major.faculty] += 1
                        current_sequence_number = faculty_sequence_counters[
                            major.faculty
                        ]

                        # Create the new name based on the faculty and the new number.
                        new_sequence_name = (
                            f"stream{current_sequence_number}_{major.faculty}"
                        )

                        print(
                            f"  -> Found new unique plan. Creating '{new_sequence_name}' in database."
                        )
                        sequence_obj = Sequence(
                            name=new_sequence_name, plan=plan_string
                        )
                        db.session.add(sequence_obj)
                        # We need to flush to ensure the object gets an ID before we try to append it.
                        db.session.flush()

                    # Associate the sequence (found or new) with the major
                    if sequence_obj not in major.sequences:
                        print(
                            f"  -> Associating '{sequence_obj.name}' with {major.name}."
                        )
                        major.sequences.append(sequence_obj)
                    else:
                        print(
                            f"  -> '{sequence_obj.name}' is already associated with {major.name}."
                        )

                # Commit changes after each major is successfully processed.
                print(f"  -> Committing changes for {major.name}...")
                success.append(major.name)
                db.session.commit()

            except NoSuchElementException:
                errors.append(major.name)
                print(
                    f"  -> Could not find the expected content structure on {major.url}"
                )
            except Exception as e:
                errors.append(major.name)
                print(f"  -> An error occurred while processing {major.name}: {e}")

    finally:
        # This block will always execute, ensuring the driver is closed properly.
        if driver:
            print("\nClosing WebDriver...")
            driver.quit()

    print("\nScraping complete.")
    return success, errors

def scrape_math() -> tuple[list[str], list[str]]:
    """Scrapes sequence charts for Mathematics majors from a specific URL.

    Returns:
        tuple: A tuple containing two lists:
            - success: List of successfully processed sequence names.
            - errors: List of errors encountered during processing.

    Returns:
        The Success and the failure ones
    """
    success, errors = [], []  # Initialize lists to track success and errors
    driver = None  # Initialize driver to None before the try block

    try:
        print("Initializing WebDriver...")
        # Set up Selenium WebDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)

        # Navigate to the sequence charts page
        driver.get("https://uwaterloo.ca/new-math-students/co-op/sequence-charts")

        # Find all tables on the page
        tables = driver.find_elements(By.TAG_NAME, "table")

        # Predefined options for filtering majors
        options = [[], [64, 65], [78]]

        # Iterate through each table
        for i in range(len(tables)):
            # Extract rows from the table body
            rows = tables[i].find_element(By.TAG_NAME, "tbody").find_elements(By.TAG_NAME, "tr")

            for r in rows:
                # Extract sequence name
                try:
                    name = r.find_element(By.TAG_NAME, "th").text
                except Exception:
                    name = r.find_elements(By.TAG_NAME, "td")[0].text

                # Extract sequence plan
                plan = ""
                blocks = r.find_elements(By.TAG_NAME, "td")
                for j in range(1, len(blocks)):
                    if "WT" in blocks[j].text:
                        plan += "Coop-"
                    elif blocks[j].text.strip() == "":
                        plan += "Off-"
                    else:
                        plan += "Study-"

                # Create a new Sequence object
                seq = Sequence(name=name, plan=plan)
                db.session.add(seq)
                db.session.flush()

                # Determine majors to associate with the sequence
                if i == 0:
                    majors = Major.query.filter_by(faculty="Mathematics").filter(
                        Major.id.not_in([64, 65, 78])
                    ).all()
                else:
                    majors = Major.query.filter_by(faculty="Mathematics").filter(
                        Major.id.in_(options[i])
                    ).all()

                # Associate the sequence with the majors
                for m in majors:
                    m.sequences.append(seq)
                    db.session.add(m)
                    db.session.flush()

                # Add the sequence name to the success list
                success.append(name)
                print(f"Processed sequence: {name}")

        # Commit all changes to the database
        db.session.commit()

    except Exception as e:
        # Handle any errors that occur during processing
        print("An error occurred during scraping.")
        print(e)
        errors.append(str(e))
    finally:
        # Ensure the WebDriver is closed properly
        if driver:
            print("Closing WebDriver...")
            driver.quit()

    return success, errors
