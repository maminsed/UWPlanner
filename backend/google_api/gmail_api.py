import os
import base64
from email.message import EmailMessage
from .google_api import create_service

def init_gmail_service(client_file, api_name='gmail', api_version='v1', scopes=["https://mail.google.com/"]):
    return create_service(client_file, api_name, api_version, scopes)

def gmail_send_message():
    """Create and send an email message
        Print the returned  message id
        Returns: Message object, including message id
    """
    try:
        client_service = os.path.relpath(os.path.join(os.getcwd(), '..', 'client_secret.json'))
        service = init_gmail_service(client_service)
        message = EmailMessage()

        message.set_content('THIS IS AN automated EmAIL RARRR')

        message['To'] = "aminisnothere@gmail.com"
        message['From'] = 'me'
        message['Subject'] = "Warm regards STFU your warm regards"
        
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        create_message = {"raw": encoded_message}
        send_message = (
            service.users()
            .messages()
            .send(userId="me", body=create_message)
            .execute()
        )
        print(f"Message Id: {send_message["id"]}")
    except Exception as e:
        print("Error Occured")
        print(e)
    send_message = None

if __name__ == '__main__':
    gmail_send_message()
