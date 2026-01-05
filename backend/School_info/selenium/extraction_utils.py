from typing import Literal


class InfoClass:
    id: str = ""
    notReturnedTags = set()
    envVars: dict[str] = {}
    infoDictionary: dict[str, list | dict | int | set] = {}
    typesDictionary: dict[str, Literal["set", "list", "dict", "int", "float"]] = {}

    def __init__(
        self,
        returnedClasses: list[
            tuple[str, list | dict | int] | tuple[str, list | dict | int, bool]
        ]
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
        self.typesDictionary = {
            key: type(value).__name__ for key, value in self.infoDictionary.items()
        }

    def add(self, tag: str, key: str | int, value: str | dict | None = None) -> None:
        """Add or update a value in the info dictionary for a given tag.

        Args:
            tag: The tag to add/update
            key: The key or index to use
            value: Optional value to set (for dict-like tags)

        """
        if tag in self.infoDictionary:
            typeOfTag = self.typesDictionary[tag]
            if value is None:
                if typeOfTag == "float" or typeOfTag == "int":
                    self.infoDictionary[tag] = key
                elif typeOfTag == "list":
                    self.infoDictionary[tag].append(key)
                else:  # can't be dictionary
                    assert typeOfTag != "dict", "cant do dictionary with no value"
                    self.infoDictionary[tag].add(key)
            else:
                assert typeOfTag == "list" or typeOfTag == "dict", (
                    "can't do key,value with something other than list or dict"
                )
                self.infoDictionary[tag][key] = value
            if "error" in tag.lower() or "warning" in tag.lower():
                print(f"\033[93m{tag}:{key}:{value}\033[0m")
        else:
            self.notReturnedTags.add(tag)

    def get(self, tag: str, default=None) -> list | dict | int | str | bool:
        """Retrieve a value by tag from info dictionary or environment variables.

        Args:
            tag: The tag to retrieve

        Returns:
            The value associated with the tag

        """
        if tag in self.infoDictionary:
            return self.infoDictionary[tag]
        return self.envVars.get(tag, default)

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
            updated_key = f"{i}_{key}"
            if key in removedTags:
                self.infoDictionary.pop(key)
            elif self.typesDictionary[key] == "set":
                self.infoDictionary[updated_key] = list(self.infoDictionary.pop(key))
            else:
                self.infoDictionary[updated_key] = self.infoDictionary.pop(key)
        print(f"notReturnedTags: {self.notReturnedTags}")
        return self.infoDictionary
