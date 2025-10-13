import json


def translate_path(path: str): # returns: [1A, 1B, ...]
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

def term_inc(term:int):
    next_map = {1:5,5:9,9:1}
    month = next_map[term % 10]
    year = term // 10 + int(month==1)
    return year * 10 + month

def translate_to_id(path: str, started_term:int): # returns [1255,...]
    res = json.loads(path)
    curr_sem = started_term
    for i in range(len(res)):
        res[i] = curr_sem
        curr_sem=term_inc(curr_sem)
    return res

termMap = {1:0,5:1,9:2}
def term_distance(termId1:int,termId2:int):
    if termId1 > termId2: return term_distance(termId2,termId1)
    yearDiff = termId2 // 10 - termId1 // 10
    monthDiff = termMap[termId2 % 10] - termMap[termId1 % 10]
    return yearDiff * 3 + monthDiff
