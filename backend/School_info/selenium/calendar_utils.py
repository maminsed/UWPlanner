class InfoClass:
    id: str = ""
    notReturnedTags = set()

    def __init__(
        self,
        returnedClasses: list[tuple[str, list | dict | int]]
        | dict[str, list | dict | int],
        priortrizedTags: list[str] = [],
    ):
        self.priortrizedTags = priortrizedTags
        if type(returnedClasses) == dict:
            self.infoDictionary = returnedClasses
        else:
            self.infoDictionary = {key: value for key, value in returnedClasses}
            if len(priortrizedTags) == 0:
                self.priortrizedTags = [key for key, _ in returnedClasses]

    def add(self, tag: str, key: str | int, value: str | dict | None = None):
        if tag in self.infoDictionary:
            if type(key) == int:
                self.infoDictionary[tag] = key
            elif value is None:
                self.infoDictionary[tag].append(key)
            else:
                self.infoDictionary[tag][key] = value
        else:
            self.notReturnedTags.add(tag)

    def get(self, tag: str):
        return self.infoDictionary[tag]

    def returnJson(self, additionalTags: dict):
        self.infoDictionary.update(additionalTags)
        for i, key in enumerate(self.priortrizedTags):
            self.infoDictionary[f"{i}_{key}"] = self.infoDictionary.pop(key)
        print(f"notReturnedTags: {self.notReturnedTags}")
        return self.infoDictionary
