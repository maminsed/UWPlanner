def translate_path(path: str):
    res = path.split("-")
    yearCount = 1
    semCount = 0
    wtCount = 1
    for i in range(len(res)):
        if res[i] == "Study":
            res[i] = f"{yearCount}{'B' if semCount else 'A'}"
            yearCount += semCount
            semCount = (semCount + 1) % 2
        elif res[i] == "Coop":
            res[i] = f"WT{wtCount}"
            wtCount += 1
    if res[-1] == "":
        res.pop()
    return res
