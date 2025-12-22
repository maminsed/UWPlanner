class InfoClass:
    id: str = ""
    notReturnedTags = set()
    envVars: dict[str] = {}

    def __init__(
        self,
        returnedClasses: list[tuple[str, list | dict | int]]
        | dict[str, list | dict | int],
        priortrizedTags: list[str] = [],
    ) -> None:
        """Initialize InfoClass with returned classes and prioritized tags.

        Args:
            returnedClasses: Either a dict or list of tuples containing tag-value pairs
            priortrizedTags: Optional list of tags in priority order

        """
        self.priortrizedTags = priortrizedTags
        if type(returnedClasses) == dict:
            self.infoDictionary = returnedClasses
        else:
            self.infoDictionary = {key: value for key, value in returnedClasses}
            if len(priortrizedTags) == 0:
                self.priortrizedTags = [key for key, _ in returnedClasses]

    def add(self, tag: str, key: str | int, value: str | dict | None = None) -> None:
        """Add or update a value in the info dictionary for a given tag.

        Args:
            tag: The tag to add/update
            key: The key or index to use
            value: Optional value to set (for dict-like tags)

        """
        if tag in self.infoDictionary:
            if type(key) == int:
                self.infoDictionary[tag] = key
            elif value is None:
                self.infoDictionary[tag].append(key)
            else:
                self.infoDictionary[tag][key] = value
        else:
            self.notReturnedTags.add(tag)

    def get(self, tag: str) -> list | dict | int | str:
        """Retrieve a value by tag from info dictionary or environment variables.

        Args:
            tag: The tag to retrieve

        Returns:
            The value associated with the tag

        """
        if tag in self.infoDictionary:
            return self.infoDictionary[tag]
        return self.envVars[tag]

    def setEnvVar(self, tag: str, value) -> None:
        """Set an environment variable.

        Args:
            tag: The variable name
            value: The value to set

        """
        self.envVars[tag] = value

    def returnJson(self, additionalTags: dict, removedTags: set[str] = set()) -> dict:
        """Prepare and return the info dictionary as JSON-ready format.

        Args:
            additionalTags: Dictionary of additional tags to include
            removedTags: Set of tags to exclude from the result

        Returns:
            The formatted info dictionary with prioritized keys

        """
        self.infoDictionary.update(additionalTags)
        for i, key in enumerate(self.priortrizedTags):
            if key in removedTags:
                self.infoDictionary.pop(key)
            else:
                self.infoDictionary[f"{i}_{key}"] = self.infoDictionary.pop(key)
        print(f"notReturnedTags: {self.notReturnedTags}")
        return self.infoDictionary
