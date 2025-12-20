class InfoClass:
    id: str = ""
    notReturnedTags = set()
    envVars: dict[str] = {}

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
        if tag in self.infoDictionary:
            return self.infoDictionary[tag]
        return self.envVars[tag]

    def setEnvVar(self, tag: str, value):
        self.envVars[tag] = value

    def returnJson(self, additionalTags: dict, removedTags: set[str] = set()):
        self.infoDictionary.update(additionalTags)
        for i, key in enumerate(self.priortrizedTags):
            if key in removedTags:
                self.infoDictionary.pop(key)
            else:
                self.infoDictionary[f"{i}_{key}"] = self.infoDictionary.pop(key)
        print(f"notReturnedTags: {self.notReturnedTags}")
        return self.infoDictionary
