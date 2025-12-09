import re
from backend.School_info.selenium.course_reqs import groupConditionRegExList
import os.path as path

def parseGeneral(text:str,i:int)->tuple[int,int]:
    """legnth, ending"""
    if text[i] == "\\":
        return parseCount(text,i+2)
    if text[i] == "^" or text[i] == "$":
        return 0, i+1
    if re.match(r"[a-z0-9A-Z. /^\-,:;]",text[i]):
        return parseCount(text,i+1)
    print(text[:i]+"<"+text[i]+">"+text[i+1:])
    raise RuntimeError(f"'{text[i]}' is not a general character")

def parseCount(text:str,i:int)->tuple[int,int]:
    #count,i
    if i >= len(text):
        return 1,i
    if text[i] == "{":
        otherEnd = text.index("}",i)
        smallest = 0 if text[i+1] == "," else int(text[i+1])
        return smallest,otherEnd+1
    elif text[i] == "+":
        return 1,i+1
    elif text[i] == "*" or text[i] == "?":
        return 0,i+1
    return 1,i

def parseParan(text:str,i:int)->tuple[int,int]:
    # length, ending
    length = 0
    isOr = False
    isExclamationMark = False
    currentLength = 0
    i+=1

    while i < len(text):
        deltaL = 0
        if text[i] == "(":
            deltaL,i = parseParan(text,i,)
        elif text[i] == "[":
            deltaL,i = parseSquareBraket(text,i)
        elif text[i] == "?" or text[i] == ":":
            i+=1
        elif text[i] == "!":
            isExclamationMark = True
            i+=1
        elif text[i] == "|":
            if not isOr:
                isOr = True
                currentLength=length
            else:
                length = min(length,currentLength)
            i+=1
            currentLength = 0
        elif text[i] == ")":
            l,i = parseCount(text,i+1)
            length = l*min(length,currentLength)
            break
        else:
            deltaL,i = parseGeneral(text,i)
        if isOr:
            currentLength+=deltaL
        else:
            length+=deltaL
    if isExclamationMark:
        length = 0
    return length,i

def parseSquareBraket(text:str,i:int) -> tuple[int,int]:
    end=text.find("]",i)
    return parseCount(text,end+1)

def parseTotal(text:str)->int:
    i = 0
    length = 0
    while i < len(text):
        if text[i] == "(":
            l,i = parseParan(text,i)
        elif text[i] == "[":
            l,i= parseSquareBraket(text,i)
        else:
            l,i = parseGeneral(text,i)
        length+=l
    return length

def extractTemplateRegExList(keys:list[int]):
    res = []
    file_path = path.join(path.dirname(__file__),"backend","School_info","selenium","course_reqs.py")
    print(f"file_path: {file_path}")
    searchList = [
        (lambda x: x.startswith("groupConditionRegExList:")),
        (lambda x: "=" in x and "[" in x),
        # (lambda x: x.startswith("]")),
    ]
    j=0
    print(len(searchList))
    startParanCount=0
    endParanCount=0
    current = ""
    count = 0
    with open(file_path, "r") as f:
        for i,line in enumerate(f):
            if j < len(searchList) and searchList[j](line):
                print(f"{i}: '{line}'")
                j+=1
            elif j == len(searchList):
                startParanCount+=line.count("(")
                endParanCount+=line.count(")")
                if startParanCount != 0 and startParanCount == endParanCount:
                    current+=line
                    startParanCount = 0
                    endParanCount = 0
                    count+=1
                    res.append(current)
                    current=""
                else:
                    current+=line

                if count == len(keys):
                    break
    print(f"count: {count} and size: {len(keys)}")
    newres = [""]*len(keys)
    for i in range(len(res)):
        newres[i] = res[keys[i]]
    with open("test.text","w") as f:
        for line in newres:
            f.write(line)
    
                    

if __name__ == "__main__":
    dic = {}
    for i,(id,regex,_) in enumerate(groupConditionRegExList):
        length = parseTotal(regex)
        dic[i] = length
    #length,index
    resKeys:list[tuple[int,int]] = [(v,k) for k,v in dic.items()]
    resKeys.sort()
    print(resKeys)
    extractTemplateRegExList([i[1] for i in resKeys])
