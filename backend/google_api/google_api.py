import os
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import Resource, build


def create_service(
    client_secret_file: str,
    api_name: str,
    api_version: str,
    *scopes: str,
    prefix: str = "",
) -> Optional[Resource]:
    """Connects to a Google API with the specified name and version.

    Args:
        client_secret_file (str):
            Path to the client secret JSON file.
        api_name (str):
            Name of the API (e.g., 'gmail').
        api_version (str):
            Version of the API to use (e.g., 'v1').
        *scopes (List(str)):
            One or more OAuth2 scopes required for the API.
        prefix (str):
            Optional prefix for the token file name.

    Returns:
        googleapiclient.discovery.Resource or None:
            Authorized service instance if successful; otherwise, None.

    """
    scope = scopes[0]

    creds = None
    working_dir = os.path.abspath(os.path.dirname(__file__))
    token_dir = "token_files"  # noqa: S105
    token_file = f"token_{api_name}_{api_version}{prefix}.json"

    # check if token dir exists first if not create it:
    if not os.path.exists(os.path.join(working_dir, token_dir)):
        os.mkdir(os.path.join(working_dir, token_dir))

    # If the token exists, get the credentials:
    if os.path.exists(os.path.join(working_dir, token_dir, token_file)):
        creds = Credentials.from_authorized_user_file(
            os.path.join(working_dir, token_dir, token_file), scope
        )

    # Valide creds if not valid
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(client_secret_file, scope)
            creds = flow.run_local_server(port=0)
        # Save the updated credentials for future use.
        with open(os.path.join(working_dir, token_dir, token_file), "w") as token:
            token.write(creds.to_json())

    try:
        service = build(
            api_name, api_version, credentials=creds, static_discovery=False
        )
        print(api_name, api_version, "service created successfully")
        return service
    except Exception as e:
        print(e)
        print(f"failed to create service instance for {api_name}")
        os.remove(os.path.join(working_dir, token_dir, token_file))
        return None
