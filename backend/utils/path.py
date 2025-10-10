import json


def translate_path(path: str):
    # Split the input path string by the "-" delimiter
    res = json.loads(path)
    
    # Initialize counters for year, semester, and work term
    yearCount = 1  # Tracks the academic year
    semCount = 0   # Tracks the semester within the year (0 for A, 1 for B)
    wtCount = 1    # Tracks the work term number
    
    # Iterate through each part of the split path
    for i in range(len(res)):
        if res[i] == "Study":
            # Replace "Study" with the corresponding academic year and semester
            res[i] = f"{yearCount}{'B' if semCount else 'A'}"
            # Increment yearCount if moving to the next academic year
            yearCount += semCount
            # Toggle semCount between 0 (A) and 1 (B)
            semCount = (semCount + 1) % 2
        elif res[i] == "Coop":
            # Replace "Coop" with the corresponding work term number
            res[i] = f"WT{wtCount}"
            # Increment the work term counter
            wtCount += 1
    
    # Remove the last element if it is an empty string (caused by trailing "-")
    if res[-1] == "":
        res.pop()
    
    # Return the modified path as a list of strings
    return res
