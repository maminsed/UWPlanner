"""
Regex Parser and Reorderer for Course Requirement Patterns

This module analyzes and reorders regular expression patterns used for parsing course requirements.
It calculates the minimum match length for each regex pattern and sorts them by length to optimize
matching order (longer patterns first to make sure if there is a bigger match that matches first). The reordered patterns are then extracted
from the source file and written to an output file.

Main functionality:
- parse_total(): Calculates minimum match length for a regex pattern
- extract_template_regex_list(): Extracts and reorders regex patterns from course_reqs.py
- Supports parsing of regex constructs: parentheses, square brackets, quantifiers, alternation, etc.
"""

import re
from backend.School_info.selenium.course_reqs import groupConditionRegExList
import os.path as path

def parse_general(text: str, index: int) -> tuple[int, int]:
    """Returns (length, ending_index)"""
    if text[index] == "\\":
        return parse_count(text, index + 2)
    if text[index] == "^" or text[index] == "$":
        return 0, index + 1
    if re.match(r"[a-z0-9A-Z. /^\-,:;]", text[index]):
        return parse_count(text, index + 1)
    print(text[:index] + "<" + text[index] + ">" + text[index + 1:])
    raise RuntimeError(f"'{text[index]}' is not a general character")

def parse_count(text: str, index: int) -> tuple[int, int]:
    """Returns (count, ending_index)"""
    if index >= len(text):
        return 1, index
    if text[index] == "{":
        closing_brace_index = text.index("}", index)
        min_count = 0 if text[index + 1] == "," else int(text[index + 1])
        return min_count, closing_brace_index + 1
    elif text[index] == "+":
        return 1, index + 1
    elif text[index] == "*" or text[index] == "?":
        return 0, index + 1
    return 1, index

def parse_parenthesis(text: str, index: int) -> tuple[int, int]:
    """Returns (length, ending_index)"""
    total_length = 0
    is_or_expression = False
    is_negative_lookahead = False
    current_branch_length = 0
    index += 1

    while index < len(text):
        char_length = 0
        if text[index] == "(":
            char_length, index = parse_parenthesis(text, index)
        elif text[index] == "[":
            char_length, index = parse_square_bracket(text, index)
        elif text[index] == "?" or text[index] == ":":
            index += 1
        elif text[index] == "!":
            is_negative_lookahead = True
            index += 1
        elif text[index] == "|":
            if not is_or_expression:
                is_or_expression = True
                current_branch_length = total_length
            else:
                total_length = min(total_length, current_branch_length)
            index += 1
            current_branch_length = 0
        elif text[index] == ")":
            multiplier, index = parse_count(text, index + 1)
            total_length = multiplier * min(total_length, current_branch_length)
            break
        else:
            char_length, index = parse_general(text, index)
        
        if is_or_expression:
            current_branch_length += char_length
        else:
            total_length += char_length
    
    if is_negative_lookahead:
        total_length = 0
    return total_length, index

def parse_square_bracket(text: str, index: int) -> tuple[int, int]:
    """Returns (count, ending_index)"""
    closing_bracket_index = text.find("]", index)
    return parse_count(text, closing_bracket_index + 1)

def parse_total(text: str) -> int:
    """Parse entire regex and return total minimum match length"""
    index = 0
    total_length = 0
    while index < len(text):
        if text[index] == "(":
            char_length, index = parse_parenthesis(text, index)
        elif text[index] == "[":
            char_length, index = parse_square_bracket(text, index)
        else:
            char_length, index = parse_general(text, index)
        total_length += char_length
    return total_length

def extract_template_regex_list(sorted_indices: list[int]):
    """Extract regex patterns in specified order and write to file"""
    extracted_patterns = []
    file_path = path.join(path.dirname(__file__), "backend", "School_info", "selenium", "course_reqs.py")
    print(f"file_path: {file_path}")
    
    search_criteria = [
        (lambda line: line.startswith("groupConditionRegExList:")),
        (lambda line: "=" in line and "[" in line),
    ]
    search_index = 0
    print(len(search_criteria))
    
    open_paren_count = 0
    close_paren_count = 0
    current_pattern = ""
    pattern_count = 0
    
    with open(file_path, "r") as f:
        for line_number, line in enumerate(f):
            if search_index < len(search_criteria) and search_criteria[search_index](line):
                print(f"{line_number}: '{line}'")
                search_index += 1
            elif search_index == len(search_criteria):
                open_paren_count += line.count("(")
                close_paren_count += line.count(")")
                
                if open_paren_count != 0 and open_paren_count == close_paren_count:
                    current_pattern += line
                    open_paren_count = 0
                    close_paren_count = 0
                    pattern_count += 1
                    extracted_patterns.append(current_pattern)
                    current_pattern = ""
                else:
                    current_pattern += line

                if pattern_count == len(sorted_indices):
                    break
    
    print(f"pattern_count: {pattern_count} and size: {len(sorted_indices)}")
    
    reordered_patterns = [""] * len(sorted_indices)
    for i in range(len(extracted_patterns)):
        reordered_patterns[i] = extracted_patterns[sorted_indices[i]]
    return reordered_patterns
    
def save(reordered_patterns):
    with open("test4.txt", "w") as f:
        f.write("[\n")
        for pattern in reordered_patterns:
            f.write(pattern)
        f.write("]")

if __name__ == "__main__":
    length_by_index = {}
    for index, (regex_id, regex_pattern, _) in enumerate(groupConditionRegExList):
        min_length = parse_total(regex_pattern)
        length_by_index[index] = (min_length,len(regex_pattern),regex_id)
    
    # Create list of (length, index) tuples
    sorted_by_length = [(values[0],values[1],index,values[2]) for index, values in length_by_index.items()]
    sorted_by_length.sort(reverse=True)
    print(sorted_by_length)
    reordered_patterns = extract_template_regex_list([item[2] for item in sorted_by_length])
    save(reordered_patterns)
