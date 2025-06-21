import base64
import os
from email.message import EmailMessage
from typing import Optional

from .google_api import Resource, create_service


def init_gmail_service(
    client_file: str,
    api_name: str = "gmail",
    api_version: str = "v1",
    scopes: Optional[list] = None,
) -> Optional[Resource]:
    """Initializes and returns an authorized Gmail service client.

    Args:
        client_file (str):
            Path to the client secret JSON file.
        api_name (str):
            Name of the API (default: 'gmail').
        api_version (str):
            Version of the API (default: 'v1').
        scopes (List[str]):
            OAuth2 scopes required for the API.

    Returns:
        Optional[Resource]:
            Authorized Gmail service instance, or None on failure.

    """
    if not scopes:
        scopes = ["https://mail.google.com/"]
    return create_service(client_file, api_name, api_version, scopes)


def gmail_send_message(to: str, body: str, subject: str) -> Optional[dict]:
    """Create and send an email message.

    Args:
        to (str):
            Recipient email address.
        body (str):
            Body text of the email.
        subject (str):
            Subject line of the email.

    Returns:
        Optional[dict]:
            The sent message resource (including its ID) if successful, otherwise None.

    """
    try:
        client_service = os.path.relpath(
            os.path.abspath(os.path.join(__file__,"..", "..", "..", "client_secret.json"))
        )
        print(
            f"Client Secret Path: {os.path.abspath(os.path.join(__file__, '..', '..', '..', 'client_secret.json'))}"
        )
        service = init_gmail_service(client_service)
        message = EmailMessage()

        message.set_content(body)

        message["To"] = to
        message["From"] = "me"
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        create_message = {"raw": encoded_message}
        send_message = (
            service.users().messages().send(userId="me", body=create_message).execute()
        )
        print(f"Message Id: {send_message['id']}")
    except Exception as e:
        print("Error Occured")
        print(e)
    send_message = None


if __name__ == "__main__":
    gmail_send_message()
